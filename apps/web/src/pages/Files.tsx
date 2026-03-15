import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFileStore } from '@/stores/files';
import { filesApi, shareApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatBytes, formatDate } from '@/utils';
import {
  Folder,
  File,
  Upload,
  FolderPlus,
  Grid,
  List,
  Download,
  Trash2,
  Share2,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { FileItem } from '@r2shelf/shared';

export default function Files() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { viewMode, setViewMode, selectedFiles, toggleFileSelection, clearSelection } =
    useFileStore();

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: files, isLoading } = useQuery({
    queryKey: ['files', folderId],
    queryFn: () =>
      filesApi.list({ parentId: folderId || null }).then((res) => res.data.data ?? []),
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => filesApi.createFolder(name, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', folderId] });
      setShowNewFolderDialog(false);
      setNewFolderName('');
      toast({ title: '创建成功', description: '文件夹已创建' });
    },
    onError: (error: any) => {
      toast({
        title: '创建失败',
        description: error.response?.data?.error?.message,
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, parentId }: { file: File; parentId: string | null }) =>
      filesApi.upload(file, parentId, (progress) => setUploadProgress(progress)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', folderId] });
      setUploadProgress(null);
      toast({ title: '上传成功', description: '文件已上传' });
    },
    onError: (error: any) => {
      setUploadProgress(null);
      toast({
        title: '上传失败',
        description: error.response?.data?.error?.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', folderId] });
      toast({ title: '删除成功', description: '文件已删除' });
    },
    onError: (error: any) => {
      toast({
        title: '删除失败',
        description: error.response?.data?.error?.message,
        variant: 'destructive',
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ fileId, password }: { fileId: string; password?: string }) =>
      shareApi.create({ fileId, password: password || undefined }),
    onSuccess: (res) => {
      const shareId = res.data.data?.id;
      if (shareId) {
        const url = `${window.location.origin}/api/share/${shareId}`;
        navigator.clipboard.writeText(url).then(() => {
          toast({ title: '分享链接已复制', description: url });
        });
      }
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      setShareFileId(null);
      setSharePassword('');
    },
    onError: (error: any) => {
      toast({
        title: '创建分享失败',
        description: error.response?.data?.error?.message,
        variant: 'destructive',
      });
    },
  });

  // ── Dropzone ──────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        uploadMutation.mutate({ file, parentId: folderId || null });
      });
    },
    [folderId, uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await filesApi.download(file.id);
      const url = window.URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      toast({ title: '下载失败', variant: 'destructive' });
    }
  };

  const handleFolderOpen = (file: FileItem) => {
    if (file.isFolder) {
      clearSelection();
      navigate(`/files/${file.id}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div {...getRootProps()} className="space-y-6">
      <input {...getInputProps()} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          {folderId ? (
            <button
              onClick={() => navigate('/files')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1"
            >
              <Home className="h-3 w-3" />
              <ChevronRight className="h-3 w-3" />
              <span>返回根目录</span>
            </button>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">管理您的文件和文件夹</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setViewMode('list')} title="列表视图">
            <List className={`h-4 w-4 ${viewMode === 'list' ? 'text-primary' : ''}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} title="网格视图">
            <Grid className={`h-4 w-4 ${viewMode === 'grid' ? 'text-primary' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            新建文件夹
          </Button>
          <label>
            <Button asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                上传文件
              </span>
            </Button>
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                selected.forEach((file) => {
                  uploadMutation.mutate({ file, parentId: folderId || null });
                });
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">上传中...</span>
            <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-primary/10 flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-lg p-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">拖放文件到此处上传</p>
          </div>
        </div>
      )}

      {/* New folder dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">新建文件夹</h2>
            <Input
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}>
                取消
              </Button>
              <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending || !newFolderName.trim()}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share dialog */}
      {shareFileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">创建分享链接</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">访问密码（可选）</label>
                <Input
                  placeholder="留空则不设密码"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShareFileId(null); setSharePassword(''); }}>
                取消
              </Button>
              <Button
                onClick={() => shareMutation.mutate({ fileId: shareFileId, password: sharePassword })}
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? '创建中...' : '创建并复制链接'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : files && files.length > 0 ? (
        viewMode === 'list' ? (
          <div className="bg-card border rounded-lg divide-y">
            {files.map((file: FileItem) => (
              <div
                key={file.id}
                className={`flex items-center gap-4 p-4 hover:bg-accent/50 cursor-pointer ${
                  selectedFiles.includes(file.id) ? 'bg-accent' : ''
                }`}
                onClick={() => file.isFolder ? handleFolderOpen(file) : toggleFileSelection(file.id)}
              >
                <div className="flex-shrink-0">
                  {file.isFolder ? (
                    <Folder className="h-8 w-8 text-primary" />
                  ) : (
                    <File className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file.isFolder ? '文件夹' : formatBytes(file.size)} · {formatDate(file.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!file.isFolder && (
                    <Button variant="ghost" size="icon" title="下载" onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {!file.isFolder && (
                    <Button variant="ghost" size="icon" title="分享" onClick={() => setShareFileId(file.id)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="删除"
                    onClick={() => {
                      if (confirm(`确定要删除 "${file.name}" 吗？`)) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map((file: FileItem) => (
              <div
                key={file.id}
                className={`bg-card border rounded-lg p-4 hover:bg-accent/50 cursor-pointer group ${
                  selectedFiles.includes(file.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => file.isFolder ? handleFolderOpen(file) : toggleFileSelection(file.id)}
              >
                <div className="flex justify-center mb-3">
                  {file.isFolder ? (
                    <Folder className="h-12 w-12 text-primary" />
                  ) : (
                    <File className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm font-medium truncate text-center">{file.name}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {file.isFolder ? '文件夹' : formatBytes(file.size)}
                </p>
                <div
                  className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!file.isFolder && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  {!file.isFolder && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShareFileId(file.id)}>
                      <Share2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (confirm(`确定要删除 "${file.name}" 吗？`)) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">暂无文件</p>
          <p className="text-sm mt-1">拖放文件或点击上传按钮添加文件</p>
        </div>
      )}
    </div>
  );
}
