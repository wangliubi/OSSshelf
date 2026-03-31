/**
 * v1/files.ts
 * 文件 API 路由
 */

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDb, files } from '../../db';
import { authMiddleware } from '../../middleware/auth';
import { checkFilePermission } from '../../routes/permissions';
import { throwAppError } from '../../middleware/error';
import { ERROR_CODES } from '@osshelf/shared';
import type { Env, Variables } from '../../types/env';

const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();
app.use('*', authMiddleware);

const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string().nullable(),
  isFolder: z.boolean(),
  parentId: z.string().nullable(),
  bucketId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const FileListResponse = z.object({
  success: z.boolean(),
  data: z.object({
    files: z.array(FileSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

const listFilesRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: z.object({
      parentId: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      type: z.enum(['file', 'folder']).optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: FileListResponse },
      },
      description: '文件列表',
    },
    401: { description: '未授权' },
  },
  tags: ['Files'],
  summary: '列出文件',
  description: '获取指定目录下的文件列表',
});

app.openapi(listFilesRoute, async (c) => {
  const userId = c.get('userId')!;
  const { parentId, page = '1', limit = '50', type } = c.req.valid('query');
  const db = getDb(c.env.DB);

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(files.userId, userId), isNull(files.deletedAt)];

  if (parentId) {
    conditions.push(eq(files.parentId, parentId));
  } else {
    conditions.push(isNull(files.parentId));
  }

  if (type === 'file') {
    conditions.push(eq(files.isFolder, false));
  } else if (type === 'folder') {
    conditions.push(eq(files.isFolder, true));
  }

  const fileList = await db
    .select()
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.isFolder), desc(files.updatedAt))
    .limit(limitNum)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(files)
    .where(and(...conditions))
    .get();

  return c.json({
    success: true,
    data: {
      files: fileList.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size ?? 0,
        mimeType: f.mimeType,
        isFolder: f.isFolder,
        parentId: f.parentId,
        bucketId: f.bucketId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total: countResult?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    },
  });
});

const getFileRoute = createRoute({
  method: 'get',
  path: '/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: FileSchema }) },
      },
      description: '文件详情',
    },
    404: { description: '文件不存在' },
  },
  tags: ['Files'],
  summary: '获取文件详情',
});

app.openapi(getFileRoute, async (c) => {
  const userId = c.get('userId')!;
  const { id } = c.req.valid('param');
  const db = getDb(c.env.DB);

  const { hasAccess } = await checkFilePermission(db, id, userId, 'read');
  if (!hasAccess) {
    throwAppError('FILE_ACCESS_DENIED', '无权访问此文件');
  }

  const file = await db.select().from(files).where(eq(files.id, id)).get();

  if (!file || file.deletedAt) {
    throwAppError('FILE_NOT_FOUND', '文件不存在');
  }

  return c.json({
    success: true,
    data: {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size ?? 0,
      mimeType: file.mimeType,
      isFolder: file.isFolder,
      parentId: file.parentId,
      bucketId: file.bucketId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    },
  });
});

const deleteFileRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.object({ message: z.string() }) }) },
      },
      description: '删除成功',
    },
  },
  tags: ['Files'],
  summary: '删除文件',
});

app.openapi(deleteFileRoute, async (c) => {
  const userId = c.get('userId')!;
  const { id } = c.req.valid('param');
  const db = getDb(c.env.DB);

  const { hasAccess, isOwner } = await checkFilePermission(db, id, userId, 'write');
  if (!hasAccess && !isOwner) {
    throwAppError('FILE_ACCESS_DENIED', '无权删除此文件');
  }

  const file = await db.select().from(files).where(eq(files.id, id)).get();

  if (!file) {
    throwAppError('FILE_NOT_FOUND', '文件不存在');
  }

  const now = new Date().toISOString();
  await db.update(files).set({ deletedAt: now, updatedAt: now }).where(eq(files.id, id));

  return c.json({ success: true, data: { message: '文件已移至回收站' } });
});

export { app as filesRoute };
