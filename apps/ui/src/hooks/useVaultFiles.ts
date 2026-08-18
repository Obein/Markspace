import { useMemo, useCallback } from 'react';
import {
  useFileEditorBuffer,
  useVaultFileLoader,
  useFileAutoSaver,
  useVaultFileOperations,
} from './vaultFiles';

export interface UseVaultFilesOptions {
  activeVaultId: string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

/**
 * Top-level Orchestrator Hook for Vault Files Management.
 * Refactored according to the Separation of Concerns (SoC) principle:
 * - useVaultFileLoader: Tree fetching, DEK unwrapping, content decryption
 * - useFileEditorBuffer: Active file state, undo/redo history, selection stats
 * - useFileAutoSaver: Debounced auto-save, DEK rotation, path synchronization
 * - useVaultFileOperations: File/folder CRUD, uploads, renames, moves, downloads
 */
export function useVaultFiles({
  activeVaultId,
  showToast,
}: UseVaultFilesOptions) {
  // 1. Editor State, Undo/Redo Stacks & Selection Stats
  const {
    activeFileId,
    setActiveFileId,
    activeTitle,
    setActiveTitle,
    activeContent,
    setActiveContent,
    searchQuery,
    setSearchQuery,
    historyPast,
    historyFuture,
    selectedWordCount,
    selectedCharCount,
    setSelectedWordCount,
    setSelectedCharCount,
    handleSelectFile: handleSelectFileFromBuffer,
    handleContentChange,
    handleUndo,
    handleRedo,
  } = useFileEditorBuffer();

  // 2. Vault Tree Loader & Content Decryption
  const { files, setFiles, isLoadingVaultTree } = useVaultFileLoader({
    activeVaultId,
    showToast,
    onInitialFilesLoaded: (decryptedList) => {
      const fileOnlyList = decryptedList.filter((f) => f.mimeType !== 'inode/directory');
      if (fileOnlyList.length > 0) {
        setActiveFileId(fileOnlyList[0].id);
        setActiveTitle(fileOnlyList[0].filename);
        setActiveContent(fileOnlyList[0].content);
      }
    },
  });

  // 3. File / Directory CRUD & Movement Operations
  const {
    isCreatingNote,
    isCreatingFolderLoading,
    isDeletingNodeId,
    isUploadingFiles,
    getUniqueFilename,
    handleCreateNote,
    handleCreateFolder,
    handleAddFiles,
    handleMoveFileToDirectory,
    handleDeleteNodeByTargetId,
    handleDownloadNodeByTargetId,
    handleDownloadActiveFile,
    handleRenameNode,
    handleDeleteFile,
  } = useVaultFileOperations({
    activeVaultId,
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    setActiveTitle,
    setActiveContent,
    setSelectedWordCount,
    setSelectedCharCount,
    showToast,
  });

  // 4. Background Debounced Auto-Saver to R2 Storage
  const { isSaving, isSaveFailed, handleRetrySave } = useFileAutoSaver({
    activeFileId,
    activeTitle,
    activeContent,
    files,
    setFiles,
    getUniqueFilename,
    showToast,
  });

  // Derived Views
  const activeVaultFiles = useMemo(() => {
    if (!activeVaultId) return [];
    return files.filter((f) => f.vaultId === activeVaultId || !f.vaultId);
  }, [files, activeVaultId]);

  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || null;
  }, [files, activeFileId]);

  const handleSelectFile = useCallback(
    (id: string) => {
      handleSelectFileFromBuffer(id, files);
    },
    [handleSelectFileFromBuffer, files]
  );

  return {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    activeTitle,
    setActiveTitle,
    activeContent,
    setActiveContent,
    searchQuery,
    setSearchQuery,
    isSaving,
    isSaveFailed,
    handleRetrySave,
    isLoadingVaultTree,
    isCreatingNote,
    isCreatingFolderLoading,
    isDeletingNodeId,
    isUploadingFiles,
    historyPast,
    historyFuture,
    selectedWordCount,
    selectedCharCount,
    setSelectedWordCount,
    setSelectedCharCount,
    activeVaultFiles,
    activeFile,
    handleSelectFile,
    handleContentChange,
    handleUndo,
    handleRedo,
    handleCreateNote,
    handleCreateFolder,
    handleAddFiles,
    handleMoveFileToDirectory,
    handleDeleteNodeByTargetId,
    handleDownloadNodeByTargetId,
    handleDownloadActiveFile,
    handleRenameNode,
    handleDeleteFile,
  };
}
