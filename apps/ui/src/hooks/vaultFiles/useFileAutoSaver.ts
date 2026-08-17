import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { normalizePath } from '../../utils/fileHelpers';

export interface UseFileAutoSaverOptions {
  activeFileId: string | null;
  activeTitle: string;
  activeContent: string;
  files: VaultFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  getUniqueFilename: (baseTitle: string, ext?: string, currentFileId?: string) => string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export interface UseFileAutoSaverReturn {
  isSaving: boolean;
  isSaveFailed: boolean;
  setIsSaveFailed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useFileAutoSaver({
  activeFileId,
  activeTitle,
  activeContent,
  files,
  setFiles,
  getUniqueFilename,
  showToast,
}: UseFileAutoSaverOptions): UseFileAutoSaverReturn {
  const { cryptoService, apiClient, cmk, isVaultUnlocked } = useApp();
  const { t } = useI18n();

  const [isSaving, setIsSaving] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId);

  // Auto-save active file payload changes into R2 Object Storage (only when modified)
  useEffect(() => {
    if (!activeFileId || !cmk || !isVaultUnlocked || activeFile?.category !== 'markdown') return;

    const existing = files.find((f) => f.id === activeFileId);
    if (!existing) return;

    if (existing.filename === activeTitle && existing.content === activeContent) {
      setIsSaveFailed(false);
      return;
    }

    // Mark as unsaved pending debounced auto-save completion
    setIsSaveFailed(true);

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const currentTarget = files.find((f) => f.id === activeFileId);
        if (!currentTarget) return;
        const updatedFilename = getUniqueFilename(activeTitle, '.md', activeFileId);

        let currentWrappedDek = currentTarget.encryptedDek;
        if (currentTarget.content !== activeContent) {
          let dek: CryptoKey | null = null;
          if (currentTarget.encryptedDek) {
            try {
              dek = await cryptoService.unwrapDEK(currentTarget.encryptedDek, cmk);
            } catch (unwrapErr) {
              console.warn(`Rotating DEK for node ${activeFileId} due to unwrap failure:`, unwrapErr);
              dek = null;
            }
          }

          if (!dek) {
            dek = await cryptoService.generateDEK();
            currentWrappedDek = await cryptoService.wrapDEK(dek, cmk);
          }

          const encryptedPayload = await cryptoService.encryptText(activeContent, dek);
          await apiClient.updateVaultNodeContent(
            activeFileId,
            encryptedPayload,
            'text/markdown',
            currentWrappedDek
          );
        }

        const lastSlash = currentTarget.path.lastIndexOf('/');
        const dirPrefix = lastSlash >= 0 ? currentTarget.path.substring(0, lastSlash) : '';
        const updatedPath = dirPrefix ? `${dirPrefix}/${updatedFilename}` : updatedFilename;

        if (normalizePath(updatedPath) !== normalizePath(currentTarget.path)) {
          await apiClient.moveVaultNode(activeFileId, updatedPath);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === activeFileId
              ? {
                  ...f,
                  name: activeTitle,
                  filename: updatedFilename,
                  path: updatedPath,
                  content: activeContent,
                  encryptedDek: currentWrappedDek,
                  size: activeContent.length,
                  updatedAt: Date.now(),
                }
              : f
          )
        );

        // Successfully saved
        setIsSaveFailed(false);
      } catch (err) {
        console.error('Auto save to Object Storage error', err);
        setIsSaveFailed(true);
        showToast(t('autoSaveFailed'), 'error');
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    activeTitle,
    activeContent,
    activeFileId,
    cmk,
    isVaultUnlocked,
    activeFile?.category,
    files,
    getUniqueFilename,
    cryptoService,
    apiClient,
    setFiles,
    showToast,
    t,
  ]);

  return {
    isSaving,
    isSaveFailed,
    setIsSaveFailed,
  };
}
