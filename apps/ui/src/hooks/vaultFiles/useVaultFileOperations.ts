import React from 'react';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { useFileMutation, UseFileMutationReturn } from './useFileMutation';
import { useFileCreation, UseFileCreationReturn } from './useFileCreation';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { useFileDeletion, UseFileDeletionReturn } from './useFileDeletion';
import { useFileDownload, UseFileDownloadReturn } from './useFileDownload';

export interface UseVaultFileOperationsOptions {
  activeVaultId: string;
  files: VaultFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  activeFileId: string | null;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTitle: React.Dispatch<React.SetStateAction<string>>;
  setActiveContent: React.Dispatch<React.SetStateAction<string>>;
  setSelectedWordCount: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCharCount: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export interface UseVaultFileOperationsReturn
  extends UseFileMutationReturn,
    UseFileCreationReturn,
    UseFileUploadReturn,
    UseFileDeletionReturn,
    UseFileDownloadReturn {}

/**
 * useVaultFileOperations
 * High-level composition façade for all vault file CRUD, uploads, mutations,
 * deletions, and downloads, cleanly orchestrating specialized sub-hooks
 * in accordance with the Separation of Concerns (SoC) principle.
 *
 * @param options - Configuration options and reactive dispatchers
 * @returns Unified file operation handlers and state flags
 */
export function useVaultFileOperations(
  options: UseVaultFileOperationsOptions
): UseVaultFileOperationsReturn {
  const {
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
  } = options;

  // 1. Filename uniqueness, renaming & directory moving
  const {
    getUniqueFilename,
    handleRenameNode,
    handleMoveFileToDirectory,
  } = useFileMutation({
    activeVaultId,
    files,
    setFiles,
    activeFileId,
    setActiveTitle,
    showToast,
  });

  // 2. Note & Folder Creation
  const {
    isCreatingNote,
    isCreatingFolderLoading,
    handleCreateNote,
    handleCreateFolder,
  } = useFileCreation({
    activeVaultId,
    setFiles,
    setActiveFileId,
    setActiveTitle,
    setActiveContent,
    setSelectedWordCount,
    setSelectedCharCount,
    getUniqueFilename,
    showToast,
  });

  // 3. Batch File & Asset Uploads
  const {
    isUploadingFiles,
    handleAddFiles,
  } = useFileUpload({
    activeVaultId,
    setFiles,
    setActiveFileId,
    setActiveTitle,
    setActiveContent,
    setSelectedWordCount,
    setSelectedCharCount,
    getUniqueFilename,
    showToast,
  });

  // 4. File & Folder Deletions with Active Node Fallback
  const {
    isDeletingNodeId,
    handleDeleteNodeByTargetId,
    handleDeleteFile,
  } = useFileDeletion({
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

  // 5. File & Directory Downloads
  const {
    handleDownloadNodeByTargetId,
    handleDownloadActiveFile,
  } = useFileDownload({
    files,
    activeFileId,
    showToast,
  });

  return {
    // State Flags
    isCreatingNote,
    isCreatingFolderLoading,
    isDeletingNodeId,
    isUploadingFiles,

    // Mutation & Path
    getUniqueFilename,
    handleRenameNode,
    handleMoveFileToDirectory,

    // Creation
    handleCreateNote,
    handleCreateFolder,

    // Upload
    handleAddFiles,

    // Deletion
    handleDeleteNodeByTargetId,
    handleDeleteFile,

    // Download
    handleDownloadNodeByTargetId,
    handleDownloadActiveFile,
  };
}
