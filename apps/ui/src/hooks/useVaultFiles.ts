import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/i18nContext';
import { VaultFileItem } from '../interfaces/INoteModels';
import {
  generateRandom4Chars,
  sanitizeFilename,
  normalizePath,
  downloadSingleFile,
} from '../utils/fileHelpers';

interface UseVaultFilesOptions {
  activeVaultId: string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export function useVaultFiles({
  activeVaultId,
  showToast,
}: UseVaultFilesOptions) {
  const {
    cryptoService,
    apiClient,
    cmk,
    isAuthenticated,
    isVaultUnlocked,
  } = useApp();
  const { t } = useI18n();

  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);

  // Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState<string[]>([]);
  const [historyFuture, setHistoryFuture] = useState<string[]>([]);

  // Operation Loading / Buffering States
  const [isLoadingVaultTree, setIsLoadingVaultTree] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);
  const [isDeletingNodeId, setIsDeletingNodeId] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Selection Stats
  const [selectedWordCount, setSelectedWordCount] = useState(0);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const activeVaultFiles = useMemo(() => {
    if (!activeVaultId) return [];
    return files.filter(
      (f) => f.vaultId === activeVaultId || !f.vaultId
    );
  }, [files, activeVaultId]);

  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || null;
  }, [files, activeFileId]);

  // Load Vault File Tree and fetch Object Storage content when unlocked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    const fetchAndDecryptVaultTree = async () => {
      try {
        setIsLoadingVaultTree(true);
        const treeNodes = await apiClient.getVaultTree();
        const decryptedList: VaultFileItem[] = [];

        for (const node of treeNodes) {
          if (node.isDirectory) {
            decryptedList.push({
              id: node.id,
              name: node.name,
              filename: node.name,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType || 'inode/directory',
              size: 0,
              content: '',
              encryptedTitle: node.name,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
            continue;
          }

          if (node.size === 0) {
            const nodeFilename = node.path.split('/').pop() || node.name;
            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: 0,
              content: '',
              blobUrl: '',
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
            continue;
          }

          try {
            const { body, encryptedDek } = await apiClient.getVaultNodeContent(node.id);
            const dek = await cryptoService.unwrapDEK(encryptedDek || node.encryptedDek, cmk);

            let contentText = '';
            let blobUrl = '';

            if (body.byteLength === 0) {
              contentText = '';
            } else if (node.category === 'markdown') {
              const encryptedStr = new TextDecoder().decode(body);
              contentText = await cryptoService.decryptText(encryptedStr, dek);
            } else {
              const blob = new Blob([body], { type: node.mimeType });
              blobUrl = URL.createObjectURL(blob);
              contentText = blobUrl;
            }

            const nodeFilename = node.path.split('/').pop() || node.name;

            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: node.size,
              content: contentText,
              blobUrl,
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
          } catch (err: any) {
            if (err?.message?.includes('404')) {
              console.warn(`Node ${node.id} content not found in storage, defaulting to empty note.`);
            } else {
              console.error(`Failed to decrypt file content for node ${node.id}`, err);
            }
            const nodeFilename = node.path.split('/').pop() || node.name;
            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: node.size,
              content: '',
              blobUrl: '',
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId,
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
          }
        }

        setFiles(decryptedList);
        const fileOnlyList = decryptedList.filter((f) => f.mimeType !== 'inode/directory');
        if (fileOnlyList.length > 0) {
          setActiveFileId(fileOnlyList[0].id);
          setActiveTitle(fileOnlyList[0].filename);
          setActiveContent(fileOnlyList[0].content);
        }
      } catch (err) {
        console.error('Failed to load Vault tree from backend', err);
        showToast(t('loadVaultFailed'), 'error');
      } finally {
        setIsLoadingVaultTree(false);
      }
    };

    fetchAndDecryptVaultTree();
  }, [isAuthenticated, isVaultUnlocked, cmk, apiClient, cryptoService, activeVaultId, showToast, t]);

  // Reset active files in memory when unauthenticated or vault is locked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) {
      setFiles([]);
      setActiveFileId(null);
      setActiveTitle('');
      setActiveContent('');
    }
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  const handleSelectFile = useCallback(
    (id: string) => {
      const selected = files.find((f) => f.id === id);
      if (selected) {
        setActiveFileId(id);
        setActiveTitle(selected.filename);
        setActiveContent(selected.content);
        setIsSaveFailed(false);
        setHistoryPast([]);
        setHistoryFuture([]);
        setSelectedWordCount(0);
        setSelectedCharCount(0);
      }
    },
    [files]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (newContent === activeContent) return;
      setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
      setHistoryFuture([]);
      setActiveContent(newContent);
    },
    [activeContent]
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [activeContent, ...prev]);
    setActiveContent(previous);
  }, [historyPast, activeContent]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
    setActiveContent(next);
  }, [historyFuture, activeContent]);

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
    [files, apiClient, showToast, t]
  );

  const handleCreateNote = useCallback(async () => {
    if (!cmk || isCreatingNote) return;

    try {
      setIsCreatingNote(true);
      setIsSaving(true);
      const dek = await cryptoService.generateDEK();
      const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

      const defaultTitle = `${t('untitledNote')}.md`;
      const filename = getUniqueFilename(defaultTitle, '.md');
      const defaultContent = '';

      const encryptedPayload = await cryptoService.encryptText(defaultContent, dek);

      const createdNode = await apiClient.createVaultNode({
        path: filename,
        name: filename,
        isDirectory: false,
        encryptedDek: wrappedDek,
        mimeType: 'text/markdown',
        category: 'markdown',
        contentBlob: encryptedPayload,
      });

      const newFile: VaultFileItem = {
        id: createdNode.id,
        name: filename,
        filename,
        path: filename,
        category: 'markdown',
        mimeType: 'text/markdown',
        size: defaultContent.length,
        content: defaultContent,
        encryptedTitle: filename,
        encryptedPayload,
        encryptedDek: wrappedDek,
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
    } catch (err) {
      console.error('Failed to create note in Object Storage', err);
      showToast(err instanceof Error ? err.message : t('createNoteFailed'), 'error');
    } finally {
      setIsCreatingNote(false);
      setIsSaving(false);
    }
  }, [cmk, isCreatingNote, cryptoService, t, getUniqueFilename, apiClient, activeVaultId, showToast]);

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
    [cmk, isCreatingFolderLoading, cryptoService, apiClient, activeVaultId, showToast, t]
  );

  const handleAddFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      if (!cmk || isUploadingFiles) return;

      const fileList = Array.from(inputFiles);
      const newFileItems: VaultFileItem[] = [];

      try {
        setIsUploadingFiles(true);
        for (const file of fileList) {
          try {
            const category = file.name.endsWith('.md') ? 'markdown' : 'binary';
            const ext = `.${file.name.split('.').pop() || ''}`;
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const filename = getUniqueFilename(baseName, ext);
            const path = category === 'markdown' ? filename : `assets/${filename}`;

            let textContent = '';
            let blobUrl = '';
            let uploadPayload: ArrayBuffer | string = '';

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
              contentBlob: uploadPayload,
            });

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
    [cmk, isUploadingFiles, getUniqueFilename, cryptoService, apiClient, activeVaultId, showToast, t]
  );

  const handleDownloadActiveFile = useCallback(() => {
    if (activeFile) {
      downloadSingleFile(activeFile);
    }
  }, [activeFile]);

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
    showToast,
    t,
  ]);

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
          } else {
            setActiveFileId(null);
            setActiveTitle('');
            setActiveContent('');
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
    [files, isDeletingNodeId, apiClient, activeFileId, activeFile?.path, activeVaultId, showToast, t]
  );

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
    [files, apiClient, activeFileId, showToast, t]
  );

  const handleDeleteFile = useCallback(async () => {
    if (activeFileId) {
      await handleDeleteNodeByTargetId(activeFileId);
    }
  }, [activeFileId, handleDeleteNodeByTargetId]);

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
