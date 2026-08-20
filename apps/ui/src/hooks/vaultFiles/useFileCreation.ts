import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { ChunkSyncService } from '../../services/ChunkSyncService';

export interface UseFileCreationOptions {
  activeVaultId: string;
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTitle: React.Dispatch<React.SetStateAction<string>>;
  setActiveContent: React.Dispatch<React.SetStateAction<string>>;
  setSelectedWordCount: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCharCount: React.Dispatch<React.SetStateAction<number>>;
  getUniqueFilename: (baseTitle: string, ext?: string, currentFileId?: string) => string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export interface UseFileCreationReturn {
  isCreatingNote: boolean;
  isCreatingFolderLoading: boolean;
  handleCreateNote: () => Promise<void>;
  handleCreateFolder: (folderName: string) => Promise<void>;
}

/**
 * useFileCreation
 * Handles creation of new zero-knowledge encrypted notes and directory nodes.
 *
 * @param options - Configuration options and reactive dispatchers
 * @returns State and handlers for note and folder creation
 */
export function useFileCreation({
  activeVaultId,
  setFiles,
  setActiveFileId,
  setActiveTitle,
  setActiveContent,
  setSelectedWordCount,
  setSelectedCharCount,
  getUniqueFilename,
  showToast,
}: UseFileCreationOptions): UseFileCreationReturn {
  const { cryptoService, apiClient, cmk } = useApp();
  const { t } = useI18n();

  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);

  /**
   * Creates an empty markdown note secured with a newly generated DEK wrapped by CMK.
   */
  const handleCreateNote = useCallback(async () => {
    if (!cmk || isCreatingNote) return;

    try {
      setIsCreatingNote(true);
      const dek = await cryptoService.generateDEK();
      const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

      const defaultTitle = `${t('untitledNote')}.md`;
      const filename = getUniqueFilename(defaultTitle, '.md');
      const defaultContent = '';

      const createdNode = await apiClient.createVaultNode({
        path: filename,
        name: filename,
        isDirectory: false,
        encryptedDek: wrappedDek,
        mimeType: 'text/markdown',
        category: 'markdown',
      });

      const syncResult = await ChunkSyncService.syncDocument(
        apiClient,
        createdNode.id,
        filename,
        defaultContent,
        cmk,
        undefined,
        'Initial creation'
      );

      const newFile: VaultFileItem = {
        id: createdNode.id,
        name: filename,
        filename,
        path: filename,
        category: 'markdown',
        mimeType: 'text/markdown',
        content: defaultContent,
        encryptedTitle: filename,
        encryptedPayload: '',
        encryptedDek: wrappedDek,
        activeManifestId: syncResult.manifest.manifestId,
        vaultId: activeVaultId,
        createdAt: createdNode.createdAt,
        updatedAt: createdNode.updatedAt,
      };

      setFiles((prev) => [newFile, ...prev]);
      setActiveFileId(newFile.id);
      setActiveTitle(filename);
      setActiveContent(defaultContent);
      setSelectedWordCount(0);
      setSelectedCharCount(0);

      if (activeVaultId) {
        localStorage.setItem(`markspace_last_active_file_${activeVaultId}`, newFile.id);
      }
    } catch (err) {
      console.error('Failed to create note in Object Storage', err);
      showToast(err instanceof Error ? err.message : t('createNoteFailed'), 'error');
    } finally {
      setIsCreatingNote(false);
    }
  }, [
    cmk,
    isCreatingNote,
    cryptoService,
    t,
    getUniqueFilename,
    apiClient,
    activeVaultId,
    setFiles,
    setActiveFileId,
    setActiveTitle,
    setActiveContent,
    setSelectedWordCount,
    setSelectedCharCount,
    showToast,
  ]);

  /**
   * Creates a directory node in the vault hierarchy.
   */
  const handleCreateFolder = useCallback(
    async (folderName: string) => {
      const cleanFolderName = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      if (!cleanFolderName || !cmk || isCreatingFolderLoading) return;

      try {
        setIsCreatingFolderLoading(true);
        const folderPath = `/${cleanFolderName}`;
        const dek = await cryptoService.generateDEK();
        const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

        const createdNode = await apiClient.createVaultNode({
          path: folderPath,
          name: folderName,
          isDirectory: true,
          encryptedDek: wrappedDek,
          mimeType: 'inode/directory',
          category: 'markdown',
        });

        const folderFileItem: VaultFileItem = {
          id: createdNode.id,
          name: folderName,
          filename: folderName,
          path: folderPath,
          category: 'markdown',
          mimeType: 'inode/directory',
          size: 0,
          content: '',
          encryptedTitle: folderName,
          encryptedPayload: '',
          encryptedDek: wrappedDek,
          vaultId: activeVaultId,
          createdAt: createdNode.createdAt,
          updatedAt: createdNode.updatedAt,
        };

        setFiles((prev) => [folderFileItem, ...prev]);
      } catch (err) {
        console.error('Failed to create directory node', err);
        showToast(err instanceof Error ? err.message : t('createFolderFailed'), 'error');
      } finally {
        setIsCreatingFolderLoading(false);
      }
    },
    [cmk, isCreatingFolderLoading, cryptoService, apiClient, activeVaultId, setFiles, showToast, t]
  );

  return {
    isCreatingNote,
    isCreatingFolderLoading,
    handleCreateNote,
    handleCreateFolder,
  };
}
