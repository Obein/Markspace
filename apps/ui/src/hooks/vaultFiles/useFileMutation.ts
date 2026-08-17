import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import {
  generateRandom4Chars,
  sanitizeFilename,
} from '../../utils/fileHelpers';

export interface UseFileMutationOptions {
  activeVaultId: string;
  files: VaultFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  activeFileId: string | null;
  setActiveTitle: React.Dispatch<React.SetStateAction<string>>;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export interface UseFileMutationReturn {
  getUniqueFilename: (baseTitle: string, ext?: string, currentFileId?: string) => string;
  handleRenameNode: (nodeId: string, newFilename: string) => Promise<void>;
  handleMoveFileToDirectory: (fileId: string, targetFolderPath: string) => Promise<void>;
}

/**
 * useFileMutation
 * Manages filename uniqueness, node renaming (with recursive directory path cascading),
 * and folder tree moving operations.
 *
 * @param options - Configuration options and reactive state dispatchers
 * @returns Filename generation and mutation handlers
 */
export function useFileMutation({
  activeVaultId,
  files,
  setFiles,
  activeFileId,
  setActiveTitle,
  showToast,
}: UseFileMutationOptions): UseFileMutationReturn {
  const { apiClient } = useApp();
  const { t } = useI18n();

  /**
   * Generates a collision-free filename within the active vault.
   */
  const getUniqueFilename = useCallback(
    (baseTitle: string, ext = '.md', currentFileId?: string): string => {
      const currentFile = files.find((f) => f.id === currentFileId);

      let cleanTitle = baseTitle.trim();
      if (!cleanTitle.toLowerCase().endsWith(ext.toLowerCase())) {
        cleanTitle = `${cleanTitle}${ext}`;
      }

      const sanitized = sanitizeFilename(cleanTitle);
      let candidate = sanitized.toLowerCase().endsWith(ext.toLowerCase())
        ? sanitized
        : `${sanitized}${ext}`;

      if (currentFile && currentFile.filename === candidate) {
        return currentFile.filename;
      }

      const isDuplicate = files.some(
        (f) =>
          f.vaultId === activeVaultId &&
          f.id !== currentFileId &&
          f.filename.toLowerCase() === candidate.toLowerCase()
      );

      if (isDuplicate) {
        const baseWithoutExt = candidate.substring(0, candidate.length - ext.length);
        candidate = `${baseWithoutExt}_${generateRandom4Chars()}${ext}`;
      }

      return candidate;
    },
    [files, activeVaultId]
  );

  /**
   * Moves a file node into a designated target directory path.
   */
  const handleMoveFileToDirectory = useCallback(
    async (fileId: string, targetFolderPath: string) => {
      const fileNode = files.find((f) => f.id === fileId);
      if (!fileNode) return;

      const newPath = `${targetFolderPath}/${fileNode.filename}`.replace(/\/+/g, '/');

      try {
        await apiClient.moveVaultNode(fileId, newPath);

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return { ...f, path: newPath };
            }
            return f;
          })
        );
      } catch (err) {
        console.error('Failed to move node path', err);
        showToast(err instanceof Error ? err.message : t('moveFileFailed'), 'error');
      }
    },
    [files, apiClient, setFiles, showToast, t]
  );

  /**
   * Renames a vault node (file or directory).
   * Cascades the updated path prefix to all children if the node is a directory.
   */
  const handleRenameNode = useCallback(
    async (nodeId: string, newFilename: string) => {
      const targetNode = files.find((f) => f.id === nodeId);
      if (!targetNode || !newFilename.trim() || targetNode.filename === newFilename.trim()) return;

      const trimmedName = newFilename.trim();
      const isDir = targetNode.mimeType === 'inode/directory';

      const lastSlash = targetNode.path.lastIndexOf('/');
      const dirPrefix = lastSlash >= 0 ? targetNode.path.substring(0, lastSlash) : '';
      const newPath = dirPrefix ? `${dirPrefix}/${trimmedName}` : trimmedName;

      try {
        await apiClient.moveVaultNode(nodeId, newPath);

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === nodeId) {
              return {
                ...f,
                name: trimmedName,
                filename: trimmedName,
                path: newPath,
                updatedAt: Date.now(),
              };
            }
            if (isDir && f.path.startsWith(`${targetNode.path}/`)) {
              const childSubPath = f.path.substring(targetNode.path.length);
              return {
                ...f,
                path: `${newPath}${childSubPath}`,
              };
            }
            return f;
          })
        );

        if (activeFileId === nodeId) {
          setActiveTitle(trimmedName);
        }
      } catch (err) {
        console.error('Failed to rename node', err);
        showToast(err instanceof Error ? err.message : t('moveFileFailed'), 'error');
      }
    },
    [files, apiClient, activeFileId, setFiles, setActiveTitle, showToast, t]
  );

  return {
    getUniqueFilename,
    handleRenameNode,
    handleMoveFileToDirectory,
  };
}
