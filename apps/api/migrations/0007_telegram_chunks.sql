-- ═══════════════════════════════════════════════════════════════════════════
-- 0007_telegram_chunks.sql
-- Telegram 分片上传支持
--
-- 变更说明：
--   新增 telegram_file_chunks 表，用于存储大文件分片上传的元数据
--
-- 设计说明：
--   Telegram Bot API 单次上传上限 50MB，超过此大小的文件需要分片上传。
--   每个分片作为独立消息发送到 Telegram，此表记录分片与原始文件的映射关系。
--
-- 字段说明：
--   id          - 分片记录 UUID
--   group_id    - 同一文件所有分片共享的 UUID（用于重组）
--   chunk_index - 分片序号（0-based）
--   tg_file_id  - Telegram 返回的 file_id
--   chunk_size  - 此分片的字节数
--   bucket_id   - 所属 Telegram 存储桶 ID
--   created_at  - 创建时间
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS telegram_file_chunks (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  tg_file_id  TEXT NOT NULL,
  chunk_size  INTEGER NOT NULL,
  bucket_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tg_chunks_group_id ON telegram_file_chunks(group_id);
CREATE INDEX IF NOT EXISTS idx_tg_chunks_bucket   ON telegram_file_chunks(bucket_id);
