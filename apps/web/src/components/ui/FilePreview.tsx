import { useEffect, useState, useRef } from 'react';
import { X, Download, Share2, ExternalLink, FileText, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileIcon } from '@/components/ui/FileIcon';
import { filesApi } from '@/services/api';
import { formatBytes, formatDate } from '@/utils';
import { isPreviewable } from '@/utils/fileTypes';
import type { FileItem } from '@osshelf/shared';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  file: FileItem;
  token: string;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onShare: (fileId: string) => void;
}

export function FilePreview({ file, token, onClose, onDownload, onShare }: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const previewUrl = filesApi.previewUrl(file.id);
  const canPreview = isPreviewable(file.mimeType);
  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isAudio = file.mimeType?.startsWith('audio/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType?.startsWith('text/');

  // Fetch text content for text files
  useEffect(() => {
    if (isText && canPreview) {
      fetch(previewUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.text())
        .then((t) => setTextContent(t))
        .catch(() => setLoadError(true));
    }
  }, [file.id, isText, canPreview, previewUrl, token]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Authenticated src for img/video/audio (we pass token via URL query for media elements)
  // Since the preview endpoint requires auth header, we use a blob URL approach for images
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if ((isImage || isVideo || isAudio) && canPreview) {
      fetch(previewUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.blob())
        .then((b) => setBlobUrl(URL.createObjectURL(b)))
        .catch(() => setLoadError(true));
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [file.id]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          'relative flex flex-col bg-card border rounded-xl shadow-2xl overflow-hidden',
          isImage || isVideo
            ? 'w-[90vw] max-w-5xl max-h-[90vh]'
            : isAudio
            ? 'w-full max-w-md'
            : isPdf
            ? 'w-[90vw] max-w-5xl h-[90vh]'
            : isText
            ? 'w-[90vw] max-w-3xl max-h-[80vh]'
            : 'w-full max-w-md'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0">
          <FileIcon mimeType={file.mimeType} isFolder={file.isFolder} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)} · {formatDate(file.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="下载" onClick={() => onDownload(file)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="分享" onClick={() => onShare(file.id)}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="关闭" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center min-h-0">
          {loadError ? (
            <div className="text-center py-12 text-muted-foreground px-6">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>预览加载失败</p>
            </div>
          ) : !canPreview ? (
            <div className="text-center py-12 px-6 space-y-4">
              <FileIcon mimeType={file.mimeType} size="lg" className="mx-auto" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatBytes(file.size)}</p>
                <p className="text-sm text-muted-foreground">{file.mimeType || '未知类型'}</p>
              </div>
              <Button onClick={() => onDownload(file)}>
                <Download className="h-4 w-4 mr-2" />
                下载文件
              </Button>
            </div>
          ) : isImage ? (
            blobUrl ? (
              <img
                src={blobUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
                onError={() => setLoadError(true)}
              />
            ) : (
              <div className="text-muted-foreground text-sm py-12">加载中...</div>
            )
          ) : isVideo ? (
            blobUrl ? (
              <video
                src={blobUrl}
                controls
                className="max-w-full max-h-full"
                onError={() => setLoadError(true)}
              />
            ) : (
              <div className="text-muted-foreground text-sm py-12">加载中...</div>
            )
          ) : isAudio ? (
            <div className="p-8 w-full space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="h-10 w-10 text-primary" />
                </div>
              </div>
              <p className="text-center font-medium">{file.name}</p>
              {blobUrl ? (
                <audio src={blobUrl} controls className="w-full" onError={() => setLoadError(true)} />
              ) : (
                <p className="text-center text-muted-foreground text-sm">加载中...</p>
              )}
            </div>
          ) : isPdf ? (
            <iframe
              src={`${previewUrl}?token=${encodeURIComponent(token)}`}
              className="w-full h-full border-0"
              title={file.name}
              onError={() => setLoadError(true)}
            />
          ) : isText ? (
            <div className="w-full h-full overflow-auto p-4">
              {textContent !== null ? (
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {textContent}
                </pre>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">加载中...</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
