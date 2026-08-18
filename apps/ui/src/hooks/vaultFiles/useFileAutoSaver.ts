import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  handleRetrySave: () => Promise<void>;
}

/**
 * useFileAutoSaver
 * Handles background debounced auto-saving to R2 object storage with differential DEK rotation,
 * robust dirty state tracking, and manual retry capabilities on network failures.
 *
 * @param options - Auto-saver configuration options and state bindings
 * @returns Saving indicators and retry handler
 */
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

  // Keep references to latest values to avoid stale closures in timers and callbacks
  const filesRef = useRef(files);
  filesRef.current = files;

  const activeTitleRef = useRef(activeTitle);
  activeTitleRef.current = activeTitle;

  const activeContentRef = useRef(activeContent);
  activeContentRef.current = activeContent;

  const activeFileIdRef = useRef(activeFileId);
  activeFileIdRef.current = activeFileId;

  // Track the snapshot of the last successfully saved or loaded state
  const lastSavedSnapshotRef = useRef<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  // Track currently active file ID to detect file switches
  const currentTrackingFileIdRef = useRef<string | null>(null);

  // Sync snapshot on active file switch or initial file load
  useEffect(() => {
    if (!activeFileId) {
      currentTrackingFileIdRef.current = null;
      lastSavedSnapshotRef.current = null;
      setIsSaveFailed(false);
      return;
    }

    // When switching to a new file, establish its baseline saved snapshot
    if (currentTrackingFileIdRef.current !== activeFileId) {
      currentTrackingFileIdRef.current = activeFileId;
      const target = filesRef.current.find((f) => f.id === activeFileId);
      if (target) {
        lastSavedSnapshotRef.current = {
          id: activeFileId,
          title: activeTitle,
          content: activeContent,
        };
      }
      setIsSaveFailed(false);
    }
  }, [activeFileId, activeTitle, activeContent]);

  /**
   * Executes the actual encryption, network payload upload, and file tree sync.
   */
  const executeSave = useCallback(async (): Promise<boolean> => {
    const fileId = activeFileIdRef.current;
    const currentTitle = activeTitleRef.current;
    const currentContent = activeContentRef.current;

    if (!fileId || !cmk || !isVaultUnlocked) {
      return false;
    }

    const currentTarget = filesRef.current.find((f) => f.id === fileId);
    if (!currentTarget || currentTarget.category !== 'markdown') {
      return false;
    }

    try {
      setIsSaving(true);

      const updatedFilename = getUniqueFilename(currentTitle, '.md', fileId);

      let currentWrappedDek = currentTarget.encryptedDek;
      if (currentTarget.content !== currentContent || !currentTarget.encryptedPayload) {
        let dek: CryptoKey | null = null;
        if (currentTarget.encryptedDek) {
          try {
            dek = await cryptoService.unwrapDEK(currentTarget.encryptedDek, cmk);
          } catch (unwrapErr) {
            console.warn(`Rotating DEK for node ${fileId} due to unwrap failure:`, unwrapErr);
            dek = null;
          }
        }

        if (!dek) {
          dek = await cryptoService.generateDEK();
          currentWrappedDek = await cryptoService.wrapDEK(dek, cmk);
        }

        const encryptedPayload = await cryptoService.encryptText(currentContent, dek);
        await apiClient.updateVaultNodeContent(
          fileId,
          encryptedPayload,
          'text/markdown',
          currentWrappedDek
        );
      }

      const lastSlash = currentTarget.path.lastIndexOf('/');
      const dirPrefix = lastSlash >= 0 ? currentTarget.path.substring(0, lastSlash) : '';
      const updatedPath = dirPrefix ? `${dirPrefix}/${updatedFilename}` : updatedFilename;

      if (normalizePath(updatedPath) !== normalizePath(currentTarget.path)) {
        await apiClient.moveVaultNode(fileId, updatedPath);
      }

      // Update files state
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                name: currentTitle,
                filename: updatedFilename,
                path: updatedPath,
                content: currentContent,
                encryptedDek: currentWrappedDek,
                size: currentContent.length,
                updatedAt: Date.now(),
              }
            : f
        )
      );

      // Record new saved baseline
      lastSavedSnapshotRef.current = {
        id: fileId,
        title: currentTitle,
        content: currentContent,
      };

      // Mark as successfully saved
      setIsSaveFailed(false);
      return true;
    } catch (err) {
      console.error('Save to Object Storage error:', err);
      setIsSaveFailed(true);
      showToast(err instanceof Error ? err.message : t('autoSaveFailed'), 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [cmk, isVaultUnlocked, getUniqueFilename, cryptoService, apiClient, setFiles, showToast, t]);

  /**
   * Manual retry handler triggered when user clicks the "Unsaved" button.
   */
  const handleRetrySave = useCallback(async () => {
    await executeSave();
  }, [executeSave]);

  // Debounced auto-save effect triggered by content or title mutations
  useEffect(() => {
    if (!activeFileId || !cmk || !isVaultUnlocked) return;

    const currentTarget = filesRef.current.find((f) => f.id === activeFileId);
    if (!currentTarget || currentTarget.category !== 'markdown') return;

    // Check if current values match the last saved snapshot
    const lastSaved = lastSavedSnapshotRef.current;
    if (
      lastSaved &&
      lastSaved.id === activeFileId &&
      lastSaved.title === activeTitle &&
      lastSaved.content === activeContent
    ) {
      setIsSaveFailed(false);
      return;
    }

    // Values differ from saved snapshot -> mark as unsaved
    setIsSaveFailed(true);

    const timer = setTimeout(() => {
      executeSave();
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, activeFileId, cmk, isVaultUnlocked, executeSave]);

  return {
    isSaving,
    isSaveFailed,
    setIsSaveFailed,
    handleRetrySave,
  };
}
