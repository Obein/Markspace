import { useMemo, useCallback } from 'react';
import {
  useFileEditorBuffer,
  useVaultFileLoader,
  useFileAutoSaver,
  useVaultFileOperations,
} from './vaultFiles';

export interface UseVaultFilesOptions {
  activeVaultId: string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => string | void;
  dismissToast?: (id: string) => void;
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
  dismissToast,
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
  const { files, setFiles, isLoadingVaultTree, loadFileContent } = useVaultFileLoader({
    activeVaultId,
    showToast,
    dismissToast,
    onInitialFilesLoaded: async (metadataList) => {
      const fileOnlyList = metadataList.filter((f) => f.mimeType !== 'inode/directory');
      const lastSavedFileId = activeVaultId
        ? localStorage.getItem(`markspace_last_active_file_${activeVaultId}`)
        : null;

      const targetFile = lastSavedFileId
        ? fileOnlyList.find((f) => f.id === lastSavedFileId)
        : null;

      if (targetFile) {
        setActiveFileId(targetFile.id);
        setActiveTitle(targetFile.filename);
        const content = await loadFileContent(targetFile);
        setActiveContent(content);
      } else {
        // Last opened file does not exist or no last file was saved
        setActiveFileId(null);
        setActiveTitle('');
        setActiveContent('');
        if (activeVaultId) {
          localStorage.removeItem(`markspace_last_active_file_${activeVaultId}`);
        }
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

  // 4. Auto-Save & Debounced CAS Synchronization
  const { isSaving, isSaveFailed, handleRetrySave } = useFileAutoSaver({
    activeFileId,
    activeTitle,
    activeContent,
    files,
    setFiles,
    getUniqueFilename,
    showToast,
  });

  // Derived Values
  const activeVaultFiles = useMemo(
    () => files.filter((f) => f.vaultId === (activeVaultId || 'vault_default')),
    [files, activeVaultId]
  );

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId]
  );

  const handleSelectFile = useCallback(
    async (id: string) => {
      await handleSelectFileFromBuffer(id, files, loadFileContent);
      if (activeVaultId && id) {
        localStorage.setItem(`markspace_last_active_file_${activeVaultId}`, id);
      }
    },
    [handleSelectFileFromBuffer, files, loadFileContent, activeVaultId]
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
