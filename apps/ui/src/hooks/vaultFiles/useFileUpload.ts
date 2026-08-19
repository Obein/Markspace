import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';

export interface UseFileUploadOptions {
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

export interface UseFileUploadReturn {
  isUploadingFiles: boolean;
  handleAddFiles: (inputFiles: FileList | File[]) => Promise<void>;
}

/**
 * useFileUpload
 * Manages uploading of local markdown notes and binary assets into encrypted vault storage.
 *
 * @param options - Configuration options and reactive dispatchers
 * @returns State and handler for file uploads
 */
export function useFileUpload({
  activeVaultId,
  setFiles,
  setActiveFileId,
  setActiveTitle,
  setActiveContent,
  setSelectedWordCount,
  setSelectedCharCount,
  getUniqueFilename,
  showToast,
}: UseFileUploadOptions): UseFileUploadReturn {
  const { cryptoService, apiClient, cmk } = useApp();
  const { t } = useI18n();

  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  /**
   * Uploads and encrypts files (markdown or binary assets).
   */
  const handleAddFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      if (!cmk || isUploadingFiles) return;

      const fileList = Array.from(inputFiles);
      const newFileItems: VaultFileItem[] = [];

      try {
        setIsUploadingFiles(true);
        for (const file of fileList) {
          try {
            // Use the shared detectCategory utility so that webp, png, gif, svg,
            // mp4, mp3, etc. are all correctly classified rather than falling
            // through to 'binary'. MIME type is passed as a secondary signal.
            const category = FileTreeBuilder.detectCategory(file.name, file.type || undefined);

            const ext = `.${file.name.split('.').pop() || ''}`;
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const filename = getUniqueFilename(baseName, ext);
            const path = category === 'markdown' ? filename : `assets/${filename}`;

            let textContent = '';
            let blobUrl = '';
            let uploadPayload: ArrayBuffer | Uint8Array = new Uint8Array(0);

            const dek = await cryptoService.generateDEK();
            const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

            if (category === 'markdown') {
              textContent = await file.text();
              uploadPayload = await cryptoService.encryptText(textContent, dek);
            } else {
              blobUrl = URL.createObjectURL(file);
              textContent = blobUrl;
              uploadPayload = await file.arrayBuffer();
            }

            const createdNode = await apiClient.createVaultNode({
              path,
              name: file.name,
              isDirectory: false,
              encryptedDek: wrappedDek,
              size: file.size,
              mimeType: file.type || 'application/octet-stream',
              category,
            });

            await apiClient.updateVaultNodeContent(
              createdNode.id,
              uploadPayload,
              file.type || 'application/octet-stream',
              wrappedDek
            );

            newFileItems.push({
              id: createdNode.id,
              name: file.name,
              filename,
              path,
              category,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              content: textContent,
              blobUrl,
              encryptedTitle: file.name,
              encryptedPayload: '',
              encryptedDek: wrappedDek,
              vaultId: activeVaultId,
              createdAt: createdNode.createdAt,
              updatedAt: createdNode.updatedAt,
            });
          } catch (err) {
            console.error('Failed to add file to Object Storage', file.name, err);
            showToast(t('uploadFileFailed'), 'error');
          }
        }

        if (newFileItems.length > 0) {
          setFiles((prev) => [...newFileItems, ...prev]);
          setActiveFileId(newFileItems[0].id);
          setActiveTitle(newFileItems[0].name);
          setActiveContent(newFileItems[0].content);
          setSelectedWordCount(0);
          setSelectedCharCount(0);
        }
      } finally {
        setIsUploadingFiles(false);
      }
    },
    [
      cmk,
      isUploadingFiles,
      getUniqueFilename,
      cryptoService,
      apiClient,
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

  return {
    isUploadingFiles,
    handleAddFiles,
  };
}
