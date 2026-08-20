import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';

export interface UseFileDeletionOptions {
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

export interface UseFileDeletionReturn {
  isDeletingNodeId: string | null;
  handleDeleteNodeByTargetId: (targetId: string) => Promise<void>;
  handleDeleteFile: () => Promise<void>;
}

/**
 * useFileDeletion
 * Handles single file deletion and recursive directory subtree deletion,
 * automatically falling back active editor state to the next available note.
 *
 * @param options - Configuration options and reactive dispatchers
 * @returns State and handlers for deleting nodes
 */
export function useFileDeletion({
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
}: UseFileDeletionOptions): UseFileDeletionReturn {
  const { apiClient } = useApp();
  const { t } = useI18n();

  const [isDeletingNodeId, setIsDeletingNodeId] = useState<string | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  /**
   * Deletes a node by target ID. If the target is a directory, removes all child nodes in state as well.
   */
  const handleDeleteNodeByTargetId = useCallback(
    async (targetId: string) => {
      const targetNode = files.find((f) => f.id === targetId);
      if (!targetNode || isDeletingNodeId) return;

      try {
        setIsDeletingNodeId(targetId);
        await apiClient.deleteVaultNode(targetId);

        const isDir = targetNode.mimeType === 'inode/directory';
        const targetPath = targetNode.path;

        const updated = files.filter((f) => {
          if (f.id === targetId) return false;
          if (isDir && f.path.startsWith(`${targetPath}/`)) return false;
          return true;
        });

        setFiles(updated);

        if (activeFileId === targetId || (isDir && activeFile?.path.startsWith(`${targetPath}/`))) {
          const remainingInVault = updated.filter(
            (f) => f.vaultId === activeVaultId && f.mimeType !== 'inode/directory'
          );
          if (remainingInVault.length > 0) {
            setActiveFileId(remainingInVault[0].id);
            setActiveTitle(remainingInVault[0].filename);
            setActiveContent(remainingInVault[0].content);
            if (activeVaultId) {
              localStorage.setItem(`markspace_last_active_file_${activeVaultId}`, remainingInVault[0].id);
            }
          } else {
            setActiveFileId(null);
            setActiveTitle('');
            setActiveContent('');
            if (activeVaultId) {
              localStorage.removeItem(`markspace_last_active_file_${activeVaultId}`);
            }
          }
          setSelectedWordCount(0);
          setSelectedCharCount(0);
        }
      } catch (err) {
        console.error('Failed to delete node via context menu', err);
        showToast(err instanceof Error ? err.message : t('deleteFailed'), 'error');
      } finally {
        setIsDeletingNodeId(null);
      }
    },
    [
      files,
      isDeletingNodeId,
      apiClient,
      activeFileId,
      activeFile?.path,
      activeVaultId,
      setFiles,
      setActiveFileId,
      setActiveTitle,
      setActiveContent,
      setSelectedWordCount,
      setSelectedCharCount,
      showToast,
      t,
    ]
  );

  /**
   * Deletes the currently active file.
   */
  const handleDeleteFile = useCallback(async () => {
    if (activeFileId) {
      await handleDeleteNodeByTargetId(activeFileId);
    }
  }, [activeFileId, handleDeleteNodeByTargetId]);

  return {
    isDeletingNodeId,
    handleDeleteNodeByTargetId,
    handleDeleteFile,
  };
}
