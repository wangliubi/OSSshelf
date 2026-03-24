/**
 * webdav.ts
 * WebDAV协议路由
 *
 * 功能:
 * - WebDAV协议完整实现
 * - 支持Windows/macOS/Linux挂载
 * - 文件读写与目录管理
 * - 锁定与解锁（LOCK/UNLOCK，兼容 Windows 资源管理器与 WinSCP）
 *
 * 路径存储格式说明：
 * - WebDAV 上传：客户端写入时对路径/文件名做 URL 编码，name 和 path 字段存储编码格式
 * （如 name="%E5%9C%A3%E5%A2%9F.json"，path="/legado/%E5%9C%A3%E5%A2%9F.json"）
 * - 非 WebDAV 上传（Web界面等）：name 和 path 字段存储原始中文
 * （如 name="个人项目"，path="/个人项目"）
 * findFileByPath 策略1直接匹配 path 字段（命中 WebDAV 上传的记录），
 * 策略2按 name+parentId 层级递归，同时尝试原始值和 decode 值（兼容两种格式）。
 *
 * Windows 资源管理器兼容性说明：
 * - 所有 401 响应必须携带 DAV 头，否则 Mini-Redirector 不认为这是 WebDAV 服务器，
 * 直接报"输入的文件夹似乎无效"且不弹出密码框。
 * - PROPFIND 响应的根节点 <href> 必须与请求路径精确匹配（不能多/少尾部斜杠）。
 * - 必须实现 LOCK/UNLOCK，否则写操作前 Windows 发出的 LOCK 请求得到 405 后卡死。
 */

import { Hono, Context } from 'hono';
import { eq, and, isNull, or } from 'drizzle-orm';
import { getDb, files, users } from '../db';
import type { File } from '../db/schema';
import { s3Put, s3Get, s3Delete } from '../lib/s3client';
import { resolveBucketConfig, updateBucketStats, checkBucketQuota } from '../lib/bucketResolver';
import { verifyPassword, getEncryptionKey } from '../lib/crypto';
import type { Env, Variables } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

// DAV 路由前缀
const DAV_PREFIX = '/dav';

// 所有响应需要携带的 DAV 基础头
const DAV_BASE_HEADERS = {
  DAV: '1, 2',
  'MS-Author-Via': 'DAV',
};

/**
 * 路径标准化工具
 * 仅处理末尾斜杠，不进行任何 URL 解码，保持客户端发送的原始编码格式
 */
function normalizePath(p: string): string {
  if (p === '/' || p === '') return '/';
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.options('/*', (_c) => {
  return new Response(null, {
    status: 200,
    headers: {
      ...DAV_BASE_HEADERS,
      Allow: 'OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, PROPPATCH, MOVE, COPY, LOCK, UNLOCK',
      'Content-Length': '0',
    },
  });
});

app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        ...DAV_BASE_HEADERS,
        'WWW-Authenticate': 'Basic realm="OSSshelf WebDAV"',
      },
    });
  }

  try {
    const credentials = atob(authHeader.slice(6));
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) throw new Error('Invalid credentials');

    const email = credentials.slice(0, colonIndex);
    const password = credentials.slice(colonIndex + 1);

    const db = getDb(c.env.DB);
    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          ...DAV_BASE_HEADERS,
          'WWW-Authenticate': 'Basic realm="OSSshelf WebDAV"',
        },
      });
    }

    c.set('userId', user.id);
    await next();
  } catch {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        ...DAV_BASE_HEADERS,
        'WWW-Authenticate': 'Basic realm="OSSshelf WebDAV"',
      },
    });
  }
});

// ── Route all WebDAV methods ───────────────────────────────────────────────
app.all('/*', async (c) => {
  const method = c.req.method.toUpperCase();
  const userId = c.get('userId')!;
  const rawPath = new URL(c.req.url).pathname;
  // 直接截取路径，不使用任何 decodeURIComponent
  const path = rawPath.replace(/^\/dav/, '') || '/';

  switch (method) {
    case 'PROPFIND':
      return handlePropfind(c, userId, path, rawPath);
    case 'GET':
    case 'HEAD':
      return handleGet(c, userId, path, method === 'HEAD');
    case 'PUT':
      return handlePut(c, userId, path);
    case 'MKCOL':
      return handleMkcol(c, userId, path);
    case 'DELETE':
      return handleDelete(c, userId, path);
    case 'MOVE':
      return handleMove(c, userId, path);
    case 'COPY':
      return handleCopy(c, userId, path);
    case 'LOCK':
      return handleLock(c, rawPath);
    case 'UNLOCK':
      return new Response(null, { status: 204, headers: DAV_BASE_HEADERS });
    case 'PROPPATCH':
      return handleProppatch(c, rawPath);
    default:
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          ...DAV_BASE_HEADERS,
          Allow: 'OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, PROPPATCH, MOVE, COPY, LOCK, UNLOCK',
        },
      });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * 按逻辑路径查找文件
 * 修复：直接使用原始请求路径匹配，不再进行任何解码尝试
 */
async function findFileByPath(db: ReturnType<typeof getDb>, userId: string, path: string): Promise<File | undefined> {
  const normalized = normalizePath(path);

  return await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        or(eq(files.path, normalized), eq(files.path, normalized + '/')),
        isNull(files.deletedAt)
      )
    )
    .get();
}

function buildPropfindXML(items: File[], rawPath: string, isRoot: boolean = false): string {
  const responses: string[] = [];

  if (isRoot) {
    responses.push(`
  <response>
    <href>${escapeXml(rawPath)}</href>
    <propstat>
      <prop>
        <displayname></displayname>
        <resourcetype><collection/></resourcetype>
        <getlastmodified>${new Date().toUTCString()}</getlastmodified>
      </prop>
      <status>HTTP/1.1 200 OK</status>
    </propstat>
  </response>`);
  }

  items.forEach((file) => {
    // 关键：href 必须和数据库存的一致（即客户端原始发送的编码串）
    let logicalPath = file.path;
    if (!logicalPath.startsWith('/')) logicalPath = '/' + logicalPath;
    if (file.isFolder && !logicalPath.endsWith('/')) logicalPath += '/';

    const href = DAV_PREFIX + logicalPath;

    responses.push(`
  <response>
    <href>${escapeXml(href)}</href>
    <propstat>
      <prop>
        <displayname>${escapeXml(file.name)}</displayname>
        <getcontentlength>${file.size}</getcontentlength>
        <getlastmodified>${new Date(file.updatedAt).toUTCString()}</getlastmodified>
        <creationdate>${file.createdAt}</creationdate>
        <resourcetype>${file.isFolder ? '<collection/>' : ''}</resourcetype>
        <getcontenttype>${file.mimeType || 'application/octet-stream'}</getcontenttype>
      </prop>
      <status>HTTP/1.1 200 OK</status>
    </propstat>
  </response>`);
  });

  return `<?xml version="1.0" encoding="utf-8"?>\n<multistatus xmlns="DAV:">${responses.join('')}\n</multistatus>`;
}

async function handlePropfind(c: AppContext, userId: string, path: string, rawPath: string) {
  const depth = c.req.header('Depth') || '1';
  const db = getDb(c.env.DB);
  const isRoot = path === '/' || path === '';

  const xmlHeaders = {
    'Content-Type': 'application/xml; charset=utf-8',
    ...DAV_BASE_HEADERS,
  };

  if (isRoot) {
    const rawItems = await db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), isNull(files.parentId), isNull(files.deletedAt)))
      .all();
    return new Response(buildPropfindXML(rawItems, rawPath, true), { status: 207, headers: xmlHeaders });
  }

  const file = await findFileByPath(db, userId, path);
  if (!file) return new Response('Not Found', { status: 404, headers: DAV_BASE_HEADERS });

  if (depth === '0') {
    return new Response(buildPropfindXML([file], rawPath, false), { status: 207, headers: xmlHeaders });
  }

  const children = file.isFolder
    ? await db.select().from(files).where(and(eq(files.userId, userId), eq(files.parentId, file.id), isNull(files.deletedAt))).all()
    : [];

  return new Response(buildPropfindXML(children, rawPath, true), { status: 207, headers: xmlHeaders });
}

async function handleGet(c: AppContext, userId: string, path: string, headOnly: boolean) {
  const db = getDb(c.env.DB);
  const file = await findFileByPath(db, userId, path);

  if (!file || file.isFolder) return new Response('Not Found', { status: 404, headers: DAV_BASE_HEADERS });

  const encKey = getEncryptionKey(c.env);
  const bucketCfg = await resolveBucketConfig(db, userId, encKey, file.bucketId, file.parentId);
  const hdrs = {
    ...DAV_BASE_HEADERS,
    'Content-Type': file.mimeType || 'application/octet-stream',
    'Content-Length': file.size.toString(),
  };

  if (bucketCfg) {
    if (headOnly) return new Response(null, { headers: hdrs });
    const s3Res = await s3Get(bucketCfg, file.r2Key);
    return new Response(s3Res.body, { headers: hdrs });
  } else if (c.env.FILES) {
    const r2Object = await c.env.FILES.get(file.r2Key);
    if (!r2Object) return new Response('Not Found', { status: 404, headers: DAV_BASE_HEADERS });
    return new Response(headOnly ? null : r2Object.body, { headers: hdrs });
  }
  return new Response('Storage not configured', { status: 500, headers: DAV_BASE_HEADERS });
}

async function handlePut(c: AppContext, userId: string, path: string) {
  const body = await c.req.arrayBuffer();
  const normalizedPath = normalizePath(path);
  const fileName = normalizedPath.split('/').pop() || 'untitled';
  const parentPath = normalizedPath.lastIndexOf('/') > 0 ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/')) : '/';

  const db = getDb(c.env.DB);
  const encKey = getEncryptionKey(c.env);
  let parentId: string | null = null;

  if (parentPath !== '/') {
    const parentFolder = await findFileByPath(db, userId, parentPath);
    if (!parentFolder) return new Response('Conflict', { status: 409, headers: DAV_BASE_HEADERS });
    parentId = parentFolder.id;
  }

  const existingFile = await findFileByPath(db, userId, normalizedPath);
  const fileId = existingFile?.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const r2Key = `files/${userId}/${fileId}/${fileName}`;
  const mimeType = c.req.header('Content-Type') || 'application/octet-stream';

  const bucketCfg = await resolveBucketConfig(db, userId, encKey, existingFile?.bucketId, parentId);

  if (bucketCfg) {
    await s3Put(bucketCfg, r2Key, body, mimeType);
  } else if (c.env.FILES) {
    await c.env.FILES.put(r2Key, body, { httpMetadata: { contentType: mimeType } });
  }

  if (existingFile) {
    await db.update(files).set({ size: body.byteLength, mimeType, updatedAt: now }).where(eq(files.id, fileId));
  } else {
    await db.insert(files).values({
      id: fileId,
      userId,
      parentId,
      name: fileName,
      path: normalizedPath,
      type: 'file',
      size: body.byteLength,
      r2Key,
      mimeType,
      isFolder: false,
      bucketId: bucketCfg?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });
    if (bucketCfg) await updateBucketStats(db, bucketCfg.id, body.byteLength, 1);
  }

  return new Response(null, { status: existingFile ? 204 : 201, headers: DAV_BASE_HEADERS });
}

async function handleMkcol(c: AppContext, userId: string, path: string) {
  const normalizedPath = normalizePath(path);
  const folderName = normalizedPath.split('/').pop() || 'untitled';
  const parentPath = normalizedPath.lastIndexOf('/') > 0 ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/')) : '/';

  const db = getDb(c.env.DB);
  let parentId: string | null = null;

  if (parentPath !== '/') {
    const parentFolder = await findFileByPath(db, userId, parentPath);
    if (!parentFolder) return new Response('Conflict', { status: 409, headers: DAV_BASE_HEADERS });
    parentId = parentFolder.id;
  }

  const existing = await findFileByPath(db, userId, normalizedPath);
  if (existing) return new Response('Method Not Allowed', { status: 405, headers: DAV_BASE_HEADERS });

  await db.insert(files).values({
    id: crypto.randomUUID(),
    userId,
    parentId,
    name: folderName,
    path: normalizedPath,
    type: 'folder',
    size: 0,
    r2Key: `folders/${crypto.randomUUID()}`,
    isFolder: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return new Response(null, { status: 201, headers: DAV_BASE_HEADERS });
}

async function handleDelete(c: AppContext, userId: string, path: string) {
  const db = getDb(c.env.DB);
  const file = await findFileByPath(db, userId, path);
  if (!file) return new Response('Not Found', { status: 404, headers: DAV_BASE_HEADERS });

  await db.delete(files).where(eq(files.id, file.id));
  return new Response(null, { status: 204, headers: DAV_BASE_HEADERS });
}

async function handleMove(c: AppContext, userId: string, path: string) {
  const destination = c.req.header('Destination');
  if (!destination) return new Response('Bad Request', { status: 400, headers: DAV_BASE_HEADERS });
  const destPath = normalizePath(new URL(destination).pathname.replace(/^\/dav/, '') || '/');

  const db = getDb(c.env.DB);
  const file = await findFileByPath(db, userId, path);
  if (!file) return new Response('Not Found', { status: 404, headers: DAV_BASE_HEADERS });

  const newName = destPath.split('/').pop() || file.name;
  await db.update(files).set({ path: destPath, name: newName, updatedAt: new Date().toISOString() }).where(eq(files.id, file.id));
  return new Response(null, { status: 201, headers: DAV_BASE_HEADERS });
}

async function handleCopy(c: AppContext, userId: string, path: string) {
  return new Response('Not Implemented', { status: 501, headers: DAV_BASE_HEADERS });
}

function handleLock(c: AppContext, rawPath: string) {
  const token = `urn:uuid:${crypto.randomUUID()}`;
  const xml = `<?xml version="1.0" encoding="utf-8"?><prop xmlns="DAV:"><lockdiscovery><activelock><locktype><write/></locktype><lockscope><exclusive/></lockscope><locktoken><href>${escapeXml(token)}</href></locktoken><lockroot><href>${escapeXml(rawPath)}</href></lockroot></activelock></lockdiscovery></prop>`;
  return new Response(xml, { status: 200, headers: { ...DAV_BASE_HEADERS, 'Content-Type': 'application/xml; charset=utf-8', 'Lock-Token': `<${token}>` } });
}

function handleProppatch(c: AppContext, rawPath: string) {
  return new Response(null, { status: 207, headers: DAV_BASE_HEADERS });
}

export default app;
