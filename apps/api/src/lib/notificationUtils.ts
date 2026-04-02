/**
 * notificationUtils.ts
 * 通知工具函数
 *
 * 功能:
 * - 统一的通知创建入口
 * - 支持多种通知类型
 */

import { getDb, users, files } from '../db';
import { eq, sql } from 'drizzle-orm';
import { notifications } from '../db';
import type { Env } from '../types/env';

export type NotificationType =
  | 'share_received'
  | 'upload_link_received'
  | 'mention'
  | 'reply'
  | 'permission_granted'
  | 'permission_granted_to'
  | 'ai_complete'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'file_deleted'
  | 'file_starred'
  | 'file_unstarred'
  | 'folder_uploaded'
  | 'folder_deleted'
  | 'bucket_created'
  | 'bucket_updated'
  | 'bucket_deleted'
  | 'webhook_created'
  | 'webhook_deleted'
  | 'apikey_created'
  | 'apikey_deleted'
  | 'password_changed'
  | 'invite_code_created'
  | 'registration_opened'
  | 'registration_closed'
  | 'invite_registration_opened'
  | 'invite_registration_closed'
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(
  env: Env,
  params: CreateNotificationParams
): Promise<string> {
  const db = getDb(env.DB);
  const id = crypto.randomUUID();

  await db.insert(notifications).values({
    id,
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    data: params.data ? JSON.stringify(params.data) : null,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return id;
}

export async function createNotificationForUsers(
  env: Env,
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  for (const userId of userIds) {
    await createNotification(env, { ...params, userId });
  }
}

export async function getUserInfo(env: Env, userId: string): Promise<{ name: string | null; email: string } | null> {
  const db = getDb(env.DB);
  const user = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).get();
  return user || null;
}

export async function getFileInfo(env: Env, fileId: string): Promise<{ id: string; name: string; isFolder: boolean } | null> {
  const db = getDb(env.DB);
  const file = await db.select({ id: files.id, name: files.name, isFolder: files.isFolder }).from(files).where(eq(files.id, fileId)).get();
  return file || null;
}
