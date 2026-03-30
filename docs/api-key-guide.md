# OSSShelf API Key 使用指南

> **版本**: v4.0  
> **最后更�?*: 2026-03-30

---

## 目录

- [概述](#概述)
- [创建 API Key](#创建-api-key)
- [认证方式](#认证方式)
- [权限范围 (Scopes)](#权限范围-scopes)
- [API 接口调用示例](#api-接口调用示例)
  - [files:read - 读取文件](#filesread---读取文件)
  - [files:write - 写入文件](#fileswrite---写入文件)
  - [shares:read - 查看分享](#sharesread---查看分享)
  - [shares:write - 管理分享](#shareswrite---管理分享)
  - [buckets:read - 查看存储桶](#bucketsread---查看存储�?
- [错误处理](#错误处理)
- [最佳实践](#最佳实�?
- [常见问题](#常见问题)

---

## 概述

API Key �?OSSShelf v4.0 新增的认证方式，专为程序化访问设计。与 JWT Token 相比，API Key 具有以下优势�?
| 特�?| JWT Token | API Key |
|------|-----------|---------|
| 有效�?| 短期（通常 7 天） | 可设置长期或永不过期 |
| 权限控制 | 完全权限 | 细粒�?Scope 控制 |
| 使用场景 | Web 应用登录 | 脚本、自动化、第三方集成 |
| 撤销方式 | 登出 | 禁用或删�?|
| 安全�?| 可刷�?| 仅显示一次，需妥善保存 |

---

## 创建 API Key

### 通过 Web 界面创建

1. 登录 OSSShelf Web 界面
2. 进入 **设置** �?**API Keys** 标签�?3. 点击 **创建 API Key**
4. 填写信息�?   - **名称**: 用于标识 API Key 用�?   - **权限**: 选择需要的 Scope
   - **过期时间**: 可选，默认永不过期
5. 点击创建后，**系统仅显示一次完整密�?*，请立即保存

### API Key 格式

```
osk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- 前缀: `osk_live_`
- 长度: 64 位十六进制字�?- 总长�? 73 字符

---

## 认证方式

API Key 支持两种认证方式�?
### 方式一：X-API-Key Header（推荐）

```http
X-API-Key: osk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 方式二：Authorization Header

```http
Authorization: ApiKey osk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### cURL 示例

```bash
# 方式一
curl -H "X-API-Key: osk_live_your_api_key_here" \
  https://api.example.com/api/files

# 方式�?curl -H "Authorization: ApiKey osk_live_your_api_key_here" \
  https://api.example.com/api/files
```

### Python 示例

```python
import requests

API_KEY = "osk_live_your_api_key_here"
BASE_URL = "https://api.example.com/api"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# 列出文件
response = requests.get(f"{BASE_URL}/files", headers=headers)
print(response.json())
```

### JavaScript 示例

```javascript
const API_KEY = "osk_live_your_api_key_here";
const BASE_URL = "https://api.example.com/api";

const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json",
};

// 列出文件
fetch(`${BASE_URL}/files`, { headers })
  .then((res) => res.json())
  .then((data) => console.log(data));
```

---

## 权限范围 (Scopes)

OSSShelf API Key 支持以下权限范围�?
| Scope | 描述 | 可访问的接口 |
|-------|------|-------------|
| `files:read` | 读取文件 | 列出、下载、搜索、预览文�?|
| `files:write` | 写入文件 | 上传、修改、删除文件，创建文件�?|
| `shares:read` | 查看分享 | 查看自己的分享列表和详情 |
| `shares:write` | 管理分享 | 创建、删除分享链�?|
| `buckets:read` | 查看存储�?| 查看存储桶配置和统计 |
| `admin:read` | 管理员权�?| 仅管理员可授予，查看系统统计 |

### 权限组合示例

```json
// 只读访问
["files:read"]

// 完整文件管理
["files:read", "files:write"]

// 文件和分享管�?["files:read", "files:write", "shares:read", "shares:write"]

// 只读 + 存储桶查�?["files:read", "buckets:read"]
```

---

## API 接口调用示例

### files:read - 读取文件

#### 列出文件列表

```bash
curl -X GET "https://api.example.com/api/files?parentId=&sortBy=name&sortOrder=asc" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-uuid-1",
        "name": "document.pdf",
        "size": 1048576,
        "mimeType": "application/pdf",
        "isFolder": false,
        "parentId": null,
        "createdAt": "2026-03-20T10:00:00Z",
        "updatedAt": "2026-03-20T10:00:00Z"
      },
      {
        "id": "folder-uuid-1",
        "name": "我的文档",
        "isFolder": true,
        "parentId": null,
        "createdAt": "2026-03-19T08:30:00Z"
      }
    ],
    "total": 2
  }
}
```

#### 下载文件

```bash
curl -X GET "https://api.example.com/api/files/file-uuid-1/download" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -o downloaded_file.pdf
```

#### 搜索文件

```bash
# 按关键词搜索
curl -X GET "https://api.example.com/api/search?query=report&limit=20" \
  -H "X-API-Key: osk_live_your_api_key_here"

# 按文件类型搜�?curl -X GET "https://api.example.com/api/search?mimeType=image/*&limit=50" \
  -H "X-API-Key: osk_live_your_api_key_here"

# 高级搜索
curl -X POST "https://api.example.com/api/search/advanced" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "conditions": [
      { "field": "name", "operator": "contains", "value": "report" },
      { "field": "size", "operator": "gte", "value": 1048576 }
    ],
    "logic": "and"
  }'
```

#### 获取文件预览

```bash
# 获取预览信息
curl -X GET "https://api.example.com/api/preview/file-uuid-1/info" \
  -H "X-API-Key: osk_live_your_api_key_here"

# 获取文本文件内容
curl -X GET "https://api.example.com/api/preview/file-uuid-1/raw" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

#### 获取文件信息

```bash
curl -X GET "https://api.example.com/api/files/file-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

---

### files:write - 写入文件

#### 创建文件�?
```bash
curl -X POST "https://api.example.com/api/files" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新建文件�?,
    "parentId": null,
    "bucketId": null
  }'
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "new-folder-uuid",
    "name": "新建文件�?,
    "isFolder": true,
    "parentId": null,
    "createdAt": "2026-03-30T12:00:00Z"
  }
}
```

#### 上传文件（小文件�?
```bash
curl -X POST "https://api.example.com/api/files/upload" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -F "file=@/path/to/local/file.pdf" \
  -F "parentId=folder-uuid-1"
```

#### 上传文件（大文件 - 预签名方式）

**步骤 1: 获取预签名上�?URL**

```bash
curl -X POST "https://api.example.com/api/presign/upload" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "large-file.zip",
    "fileSize": 524288000,
    "mimeType": "application/zip",
    "parentId": null
  }'
```

**响应**:

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.example.com/...",
    "fileId": "new-file-uuid",
    "r2Key": "files/user-id/new-file-uuid/large-file.zip",
    "expiresIn": 3600
  }
}
```

**步骤 2: 上传到存�?*

```bash
curl -X PUT "https://storage.example.com/..." \
  -H "Content-Type: application/zip" \
  --data-binary @/path/to/large-file.zip
```

**步骤 3: 确认上传**

```bash
curl -X POST "https://api.example.com/api/presign/confirm" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "new-file-uuid",
    "fileName": "large-file.zip",
    "fileSize": 524288000,
    "mimeType": "application/zip",
    "r2Key": "files/user-id/new-file-uuid/large-file.zip"
  }'
```

#### 重命名文�?文件�?
```bash
curl -X PUT "https://api.example.com/api/files/file-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新文件名.pdf"
  }'
```

#### 移动文件

```bash
curl -X POST "https://api.example.com/api/files/file-uuid-1/move" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "targetParentId": "target-folder-uuid"
  }'
```

#### 删除文件（移至回收站�?
```bash
curl -X DELETE "https://api.example.com/api/files/file-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

#### 批量操作

```bash
# 批量删除
curl -X POST "https://api.example.com/api/batch/delete" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["id1", "id2", "id3"]
  }'

# 批量移动
curl -X POST "https://api.example.com/api/batch/move" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["id1", "id2"],
    "targetParentId": "folder-uuid"
  }'

# 批量复制
curl -X POST "https://api.example.com/api/batch/copy" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["id1", "id2"],
    "targetParentId": "folder-uuid"
  }'
```

#### 编辑文件内容（文本文件）

```bash
# 获取文件原始内容
curl -X GET "https://api.example.com/api/files/file-uuid-1/raw" \
  -H "X-API-Key: osk_live_your_api_key_here"

# 更新文件内容
curl -X PUT "https://api.example.com/api/files/file-uuid-1/content" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 更新后的内容\n\n这是新的文件内容�?,
    "changeSummary": "更新文档内容"
  }'
```

**响应**:

```json
{
  "success": true,
  "data": {
    "message": "文件内容已更�?,
    "size": 45,
    "hash": "sha256-hash-value",
    "versionCreated": true
  }
}
```

---

### shares:read - 查看分享

#### 列出我的分享

```bash
curl -X GET "https://api.example.com/api/share" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "share-uuid-1",
      "fileId": "file-uuid-1",
      "fileName": "document.pdf",
      "fileSize": 1048576,
      "password": null,
      "expiresAt": "2026-12-31T23:59:59Z",
      "downloadCount": 5,
      "downloadLimit": null,
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

#### 获取分享详情

```bash
curl -X GET "https://api.example.com/api/share/share-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

---

### shares:write - 管理分享

#### 创建下载分享

```bash
curl -X POST "https://api.example.com/api/share" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-uuid-1",
    "password": "optional-password",
    "expiresAt": "2026-12-31T23:59:59Z",
    "downloadLimit": 100
  }'
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "share-uuid-new",
    "shareUrl": "https://app.example.com/s/share-uuid-new",
    "password": "optional-password",
    "expiresAt": "2026-12-31T23:59:59Z"
  }
}
```

#### 创建上传链接

```bash
curl -X POST "https://api.example.com/api/share/upload-link" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "folderId": "folder-uuid-1",
    "password": "optional-password",
    "expiresAt": "2026-12-31T23:59:59Z",
    "maxUploadSize": 104857600,
    "maxUploadCount": 10
  }'
```

#### 删除分享

```bash
curl -X DELETE "https://api.example.com/api/share/share-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

---

### buckets:read - 查看存储�?
#### 列出存储�?
```bash
curl -X GET "https://api.example.com/api/buckets" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "bucket-uuid-1",
      "name": "默认存储�?,
      "provider": "r2",
      "bucketName": "my-bucket",
      "isDefault": true,
      "isActive": true,
      "storageQuota": 107374182400,
      "storageUsed": 5242880000,
      "fileCount": 150,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### 获取单个存储�?
```bash
curl -X GET "https://api.example.com/api/buckets/bucket-uuid-1" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

#### 获取存储提供商信�?
```bash
curl -X GET "https://api.example.com/api/buckets/providers" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

---

## 错误处理

### 常见错误�?
| 错误�?| HTTP 状态码 | 描述 |
|--------|-------------|------|
| `UNAUTHORIZED` | 401 | API Key 无效或已过期 |
| `FORBIDDEN` | 403 | 权限不足（Scope 不匹配） |
| `FILE_NOT_FOUND` | 404 | 文件不存�?|
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `STORAGE_EXCEEDED` | 413 | 存储空间不足 |

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "需要以下权限之一: files:write"
  }
}
```

### 权限不足示例

�?API Key 缺少必要权限时：

```bash
# API Key 只有 files:read 权限，尝试上传文�?curl -X POST "https://api.example.com/api/files/upload" \
  -H "X-API-Key: osk_live_readonly_key" \
  -F "file=@test.txt"

# 响应
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "需要以下权限之一: files:write"
  }
}
```

---

## 最佳实�?
### 1. 最小权限原�?
只授予必要的权限�?
```json
// 只需要读取文件？不要添加 files:write
["files:read"]

// 需要上传但不需要删除？files:write 足够
["files:read", "files:write"]
```

### 2. 设置过期时间

为临时用途的 API Key 设置过期时间�?
```json
{
  "name": "临时备份脚本",
  "scopes": ["files:read", "files:write"],
  "expiresAt": "2026-06-30T23:59:59Z"
}
```

### 3. 安全存储

```python
# 推荐：使用环境变�?import os
API_KEY = os.environ.get("OSSSHELF_API_KEY")

# 不推荐：硬编码在代码�?API_KEY = "osk_live_xxxx"  # 危险�?```

### 4. 定期轮换

定期删除旧的 API Key 并创建新的：

```bash
# 1. 创建新的 API Key
# 2. 更新应用程序配置
# 3. 删除旧的 API Key
curl -X DELETE "https://api.example.com/api/keys/old-key-id" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

### 5. 监控使用情况

定期检�?API Key �?`lastUsedAt` 字段，及时发现异常使用�?
---

## 常见问题

### Q: API Key 忘记了怎么办？

A: API Key 仅在创建时显示一次。如果忘记，需要删除旧的并创建新的�?
### Q: API Key 可以刷新吗？

A: 不可以。API Key 一旦创建，内容不会改变。如需更换，请创建新的并删除旧的�?
### Q: 多个 API Key 可以同时使用吗？

A: 可以。您可以为不同用途创建多�?API Key，例如：
- 备份脚本专用 Key
- CI/CD 专用 Key
- 第三方集成专�?Key

### Q: API Key 支持的并发请求有限制吗？

A: API Key 本身没有并发限制，但受域名层面的速率限制约束�?
### Q: 如何撤销 API Key�?
A: 两种方式�?1. **禁用**: 临时停用，可以随时重新启�?2. **删除**: 永久删除，不可恢�?
```bash
# 禁用
curl -X PATCH "https://api.example.com/api/keys/key-id" \
  -H "X-API-Key: osk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# 删除
curl -X DELETE "https://api.example.com/api/keys/key-id" \
  -H "X-API-Key: osk_live_your_api_key_here"
```

---

## 完整示例：Python 备份脚本

```python
#!/usr/bin/env python3
"""
OSSShelf 文件备份脚本
使用 API Key 认证
"""

import os
import requests
from datetime import datetime

API_KEY = os.environ.get("OSSSHELF_API_KEY")
BASE_URL = "https://api.example.com/api"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def list_files(parent_id=None):
    """列出文件"""
    params = {"parentId": parent_id} if parent_id else {}
    response = requests.get(f"{BASE_URL}/files", headers=headers, params=params)
    return response.json()["data"]["files"]

def download_file(file_id, local_path):
    """下载文件"""
    response = requests.get(
        f"{BASE_URL}/files/{file_id}/download",
        headers=headers,
        stream=True
    )
    with open(local_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

def upload_file(file_path, parent_id=None):
    """上传文件"""
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        files = {"file": (filename, f)}
        data = {"parentId": parent_id} if parent_id else {}
        response = requests.post(
            f"{BASE_URL}/files/upload",
            headers={"X-API-Key": API_KEY},
            files=files,
            data=data
        )
    return response.json()

def backup_folder(folder_id, local_dir):
    """备份整个文件�?""
    files = list_files(folder_id)
    os.makedirs(local_dir, exist_ok=True)
    
    for file in files:
        if file["isFolder"]:
            # 递归备份子文件夹
            backup_folder(file["id"], os.path.join(local_dir, file["name"]))
        else:
            # 下载文件
            local_path = os.path.join(local_dir, file["name"])
            print(f"下载: {file['name']}")
            download_file(file["id"], local_path)

if __name__ == "__main__":
    # 示例：备份根目录所有文�?    backup_folder(None, "./backup")
    print("备份完成�?)
```

---

## 完整示例：Node.js 自动化脚�?
```javascript
#!/usr/bin/env node
/**
 * OSSShelf 文件同步脚本
 * 使用 API Key 认证
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const API_KEY = process.env.OSSSHELF_API_KEY;
const BASE_URL = "https://api.example.com/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  },
});

// 列出文件
async function listFiles(parentId = null) {
  const params = parentId ? { parentId } : {};
  const { data } = await api.get("/files", { params });
  return data.data.files;
}

// 上传文件
async function uploadFile(filePath, parentId = null) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);
  
  const formData = new FormData();
  formData.append("file", new Blob([fileContent]), fileName);
  if (parentId) formData.append("parentId", parentId);
  
  const { data } = await api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// 下载文件
async function downloadFile(fileId, localPath) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "arraybuffer",
  });
  fs.writeFileSync(localPath, response.data);
}

// 搜索文件
async function searchFiles(query) {
  const { data } = await api.get("/search", { params: { query } });
  return data.data.files;
}

// 主函�?async function main() {
  try {
    // 列出根目录文�?    const files = await listFiles();
    console.log(`找到 ${files.length} 个文�?文件夹`);
    
    // 搜索特定文件
    const results = await searchFiles("report");
    console.log(`搜索 "report" 找到 ${results.length} 个结果`);
    
  } catch (error) {
    console.error("错误:", error.response?.data || error.message);
  }
}

main();
```

---

## 相关文档

- [API 完整文档](./api.md)
- [部署指南](./deployment.md)
- [架构说明](./architecture.md)
