export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  storageQuota: number;
  storageUsed: number;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user';

export interface FileItem {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  path: string;
  type: FileType;
  size: number;
  r2Key: string;
  mimeType: string | null;
  hash: string | null;
  isFolder: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FileType = 'file' | 'folder';

export interface Share {
  id: string;
  fileId: string;
  userId: string;
  password: string | null;
  expiresAt: string | null;
  downloadLimit: number | null;
  downloadCount: number;
  createdAt: string;
}

export interface WebDAVSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FileUploadParams {
  file: File;
  parentId: string | null;
  onProgress?: (progress: number) => void;
}

export interface FileListParams extends PaginationParams {
  parentId: string | null;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ShareCreateParams {
  fileId: string;
  password?: string;
  expiresAt?: string;
  downloadLimit?: number;
}

export interface AuthLoginParams {
  email: string;
  password: string;
}

export interface AuthRegisterParams extends AuthLoginParams {
  name?: string;
  inviteCode?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
