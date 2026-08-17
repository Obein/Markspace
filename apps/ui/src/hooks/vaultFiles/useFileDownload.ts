import { useCallback } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { downloadSingleFile } from '../../utils/fileHelpers';

export interface UseFileDownloadOptions {
  files: VaultFileItem[];
  activeFileId: string | null;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export interface UseFileDownloadReturn {
  handleDownloadNodeByTargetId: (targetId: string) => void;
  handleDownloadActiveFile: () => void;
}

/**
 * useFileDownload
 * Manages plaintext/binary file downloading and directory batch exporting.
 *
 * @param options - Configuration options and reactive state references
 * @returns Handlers for downloading single nodes and active files
 */
export function useFileDownload({
  files,
  activeFileId,
  showToast,
}: UseFileDownloadOptions): UseFileDownloadReturn {
  const { t } = useI18n();

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  /**
   * Downloads the currently open active note or asset.
   */
  const handleDownloadActiveFile = useCallback(() => {
    if (activeFile) {
      downloadSingleFile(activeFile);
    }
  }, [activeFile]);

  /**
   * Downloads a node by target ID. If it is a directory, downloads all children individually.
   */
  const handleDownloadNodeByTargetId = useCallback(
    (targetId: string) => {
      const targetNode = files.find((f) => f.id === targetId);
      if (!targetNode) return;

      if (targetNode.mimeType === 'inode/directory') {
        const childFiles = files.filter(
          (f) => f.path.startsWith(`${targetNode.path}/`) && f.mimeType !== 'inode/directory'
        );
        if (childFiles.length === 0) {
          showToast(t('noFilesToDownload'), 'info');
          return;
        }
        childFiles.forEach((file) => {
          downloadSingleFile(file);
        });
      } else {
        downloadSingleFile(targetNode);
      }
    },
    [files, showToast, t]
  );

  return {
    handleDownloadNodeByTargetId,
    handleDownloadActiveFile,
  };
}
