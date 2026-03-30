/**
 * NotePanel.tsx
 * 文件笔记面板组件
 *
 * 功能:
 * - 显示文件相关笔记列表
 * - 支持新建/编辑/删除笔记
 * - 支持置顶和回复
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/useToast';
import NoteEditor from './NoteEditor';
import NoteCard from './NoteCard';

interface Note {
  id: string;
  content: string;
  contentHtml: string | null;
  isPinned: boolean;
  version: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface NotePanelProps {
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

const NotePanel: React.FC<NotePanelProps> = ({ fileId, isOpen, onClose }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [replyTo, setReplyTo] = useState<Note | null>(null);
  const { toast } = useToast();

  const fetchNotes = useCallback(async () => {
    if (!fileId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notes/${fileId}?limit=50`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.data.notes);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast({ title: '加载笔记失败', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [fileId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, fetchNotes]);

  const handleCreateNote = () => {
    setEditingNote(null);
    setReplyTo(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setReplyTo(null);
    setIsEditorOpen(true);
  };

  const handleReplyNote = (note: Note) => {
    setEditingNote(null);
    setReplyTo(note);
    setIsEditorOpen(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;

    try {
      const res = await fetch(`/api/notes/${fileId}/${noteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '笔记已删除' });
        fetchNotes();
      } else {
        throw new Error(data.error?.message || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${fileId}/${noteId}/pin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.data.message });
        fetchNotes();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleEditorSave = async (content: string) => {
    try {
      const url = editingNote ? `/api/notes/${fileId}/${editingNote.id}` : `/api/notes/${fileId}`;
      const method = editingNote ? 'PUT' : 'POST';

      const body: Record<string, unknown> = { content };
      if (replyTo) {
        body.parentId = replyTo.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: editingNote ? '笔记已更新' : '笔记已创建' });
        setIsEditorOpen(false);
        setEditingNote(null);
        setReplyTo(null);
        fetchNotes();
      } else {
        throw new Error(data.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  const pinnedNotes = notes.filter((n) => n.isPinned && !n.parentId);
  const regularNotes = notes.filter((n) => !n.isPinned && !n.parentId);
  const replyMap = new Map<string, Note[]>();
  notes.forEach((n) => {
    if (n.parentId) {
      const replies = replyMap.get(n.parentId) || [];
      replies.push(n);
      replyMap.set(n.parentId, replies);
    }
  });

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">笔记</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleCreateNote}>
            新建笔记
          </Button>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无笔记</p>
            <p className="text-sm mt-1">点击"新建笔记"添加第一条笔记</p>
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477V16h2a1 1 0 110 2H8a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                  置顶
                </h3>
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    replies={replyMap.get(note.id)}
                    onEdit={() => handleEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onReply={() => handleReplyNote(note)}
                    onTogglePin={() => handleTogglePin(note.id)}
                  />
                ))}
              </div>
            )}

            {regularNotes.length > 0 && (
              <div className="space-y-3">
                {pinnedNotes.length > 0 && <h3 className="text-sm font-medium text-gray-500">其他笔记</h3>}
                {regularNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    replies={replyMap.get(note.id)}
                    onEdit={() => handleEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onReply={() => handleReplyNote(note)}
                    onTogglePin={() => handleTogglePin(note.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isEditorOpen && (
        <NoteEditor
          initialContent={editingNote?.content || ''}
          title={editingNote ? '编辑笔记' : replyTo ? '回复笔记' : '新建笔记'}
          onSave={handleEditorSave}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingNote(null);
            setReplyTo(null);
          }}
        />
      )}
    </div>
  );
};

export default NotePanel;
