import { create } from 'zustand';
import type { FileItem } from '@osshelf/shared';

interface FileState {
  currentFolderId: string | null;
  selectedFiles: string[];
  viewMode: 'list' | 'grid';
  sortBy: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
  setCurrentFolder: (folderId: string | null) => void;
  setSelectedFiles: (fileIds: string[]) => void;
  toggleFileSelection: (fileId: string) => void;
  clearSelection: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSort: (sortBy: FileState['sortBy'], sortOrder: FileState['sortOrder']) => void;
  setSearchQuery: (query: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  currentFolderId: null,
  selectedFiles: [],
  viewMode: 'list',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  searchQuery: '',
  setCurrentFolder: (folderId) =>
    set({
      currentFolderId: folderId,
      selectedFiles: [],
    }),
  setSelectedFiles: (fileIds) => set({ selectedFiles: fileIds }),
  toggleFileSelection: (fileId) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(fileId)
        ? state.selectedFiles.filter((id) => id !== fileId)
        : [...state.selectedFiles, fileId],
    })),
  clearSelection: () => set({ selectedFiles: [] }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
