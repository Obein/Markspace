import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { EditorCanvas } from './components/EditorCanvas';
import { FloatingStatusCapsule } from './components/FloatingStatusCapsule';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ToastContainer, ToastMessage } from './components/Toast';
import { UnlockModal } from './components/UnlockModal';
import { UserProfileModal } from './components/UserProfileModal';
import { VaultSettingsModal } from './components/VaultSettingsModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { useApp } from './context/AppContext';
import { useI18n } from './i18n/i18nContext';
import { NoteItem, VaultFileItem, VaultInfo } from './interfaces/INoteModels';

function generateRandom4Chars(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeFilename(title: string): string {
  let nameWithoutExt = title.trim();
  if (nameWithoutExt.toLowerCase().endsWith('.md')) {
    nameWithoutExt = nameWithoutExt.substring(0, nameWithoutExt.length - 3);
  }
  const clean = nameWithoutExt.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');
  return clean || 'note';
}

function normalizePath(pathStr: string): string {
  const cleaned = pathStr.replace(/\\/g, '/').replace(/\/+/g, '/');
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

export const AppContent: React.FC = () => {
  const {
    cryptoService,
    apiClient,
    cmk,
    isAuthenticated,
    isVaultUnlocked,
    username,
    role,
    lockVault,
    logoutAccount,
  } = useApp();

  const { t } = useI18n();

  const [vaults, setVaults] = useState<VaultInfo[]>(() => {
    try {
      const stored = localStorage.getItem(`markspace_vaults_${username || 'default'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return [{ id: 'vault_default', name: t('mainVault'), createdAt: Date.now() }];
  });

  // Keep vaults persisted in localStorage
  useEffect(() => {
    if (username && vaults.length > 0) {
      try {
        localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(vaults));
      } catch (_) {}
    }
  }, [vaults, username]);

  // Sync vaults from localStorage when user logs in
  useEffect(() => {
    if (username) {
      try {
        const stored = localStorage.getItem(`markspace_vaults_${username}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVaults(parsed);
            setActiveVaultId(parsed[0].id);
            return;
          }
        }
      } catch (_) {}
      setVaults([{ id: 'vault_default', name: t('mainVault'), createdAt: Date.now() }]);
      setActiveVaultId('vault_default');
    }
  }, [username]);

  const [activeVaultId, setActiveVaultId] = useState<string>('vault_default');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVaultSettingsOpen, setIsVaultSettingsOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState<string[]>([]);
  const [historyFuture, setHistoryFuture] = useState<string[]>([]);

  const handleContentChange = (newContent: string) => {
    if (newContent === activeContent) return;
    setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
    setHistoryFuture([]);
    setActiveContent(newContent);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [activeContent, ...prev]);
    setActiveContent(previous);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
    setActiveContent(next);
  };

  // Operation Loading / Buffering States
  const [isLoadingVaultTree, setIsLoadingVaultTree] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);
  const [isDeletingNodeId, setIsDeletingNodeId] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Toast Notification System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [selectedWordCount, setSelectedWordCount] = useState(0);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const activeVaultFiles = files.filter(
    (f) => !f.vaultId || f.vaultId === activeVaultId || f.vaultId === 'vault_default' || vaults.length === 1
  );
  const activeFile = files.find((f) => f.id === activeFileId) || null;

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
            // Directory node
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

          try {
            // File node: Fetch payload blob from R2 Object Storage
            const { body, encryptedDek } = await apiClient.getVaultNodeContent(node.id);
            const dek = await cryptoService.unwrapDEK(encryptedDek || node.encryptedDek, cmk);

            let contentText = '';
            let blobUrl = '';

            if (node.category === 'markdown') {
              const encryptedStr = new TextDecoder().decode(body);
              contentText = await cryptoService.decryptText(encryptedStr, dek);
            } else {
              // Binary / Media files
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
          } catch (err) {
            console.error(`Failed to decrypt file content for node ${node.id}`, err);
            // Fallback: Still display the file in the tree even if body decryption fails
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
              vaultId: activeVaultId || 'vault_default',
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
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  // Sync active file selection
  const handleSelectFile = (id: string) => {
    const selected = files.find((f) => f.id === id);
    if (selected) {
      setActiveFileId(id);
      setActiveTitle(selected.filename);
      setActiveContent(selected.content);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    }
  };

  // Ensure unique filename rule
  const getUniqueFilename = (baseTitle: string, ext = '.md', currentFileId?: string): string => {
    const currentFile = files.find((f) => f.id === currentFileId);

    let cleanTitle = baseTitle.trim();
    if (!cleanTitle.toLowerCase().endsWith(ext.toLowerCase())) {
      cleanTitle = `${cleanTitle}${ext}`;
    }

    const sanitized = sanitizeFilename(cleanTitle);
    let candidate = sanitized.toLowerCase().endsWith(ext.toLowerCase()) ? sanitized : `${sanitized}${ext}`;

    if (currentFile && currentFile.filename === candidate) {
      return currentFile.filename;
    }

    const isDuplicate = files.some(
      (f) => f.vaultId === activeVaultId && f.id !== currentFileId && f.filename.toLowerCase() === candidate.toLowerCase()
    );

    if (isDuplicate) {
      const baseWithoutExt = candidate.substring(0, candidate.length - ext.length);
      candidate = `${baseWithoutExt}_${generateRandom4Chars()}${ext}`;
    }

    return candidate;
  };

  // Move file or folder node to a target folder path
  const handleMoveFileToDirectory = async (fileId: string, targetFolderPath: string) => {
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
  };

  // Create a new encrypted Markdown Note (Stored in R2 Object Storage)
  const handleCreateNote = async () => {
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

      setFiles([newFile, ...files]);
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
  };

  // Create a new Directory Node in Vault
  const handleCreateFolder = async (folderName: string) => {
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
  };

  // Add local files / media to Vault & Object Storage
  const handleAddFiles = async (inputFiles: FileList | File[]) => {
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
  };

  const downloadSingleFile = (file: VaultFileItem) => {
    if (file.blobUrl) {
      const a = document.createElement('a');
      a.href = file.blobUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Download active file to local disk
  const handleDownloadActiveFile = () => {
    if (activeFile) {
      downloadSingleFile(activeFile);
    }
  };

  // Auto-save active file payload changes into R2 Object Storage (only when modified)
  useEffect(() => {
    if (!activeFileId || !cmk || !isVaultUnlocked || activeFile?.category !== 'markdown') return;

    const existing = files.find((f) => f.id === activeFileId);
    if (!existing) return;

    // Git-diff check: If content and filename are unchanged, skip auto-saving completely
    if (existing.filename === activeTitle && existing.content === activeContent) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const currentTarget = files.find((f) => f.id === activeFileId);
        if (!currentTarget) return;

        const updatedFilename = getUniqueFilename(activeTitle, '.md', activeFileId);

        // ONLY update content payload (and create a Git content revision) if content actually changed!
        if (currentTarget.content !== activeContent) {
          const dek = await cryptoService.unwrapDEK(currentTarget.encryptedDek, cmk);
          const encryptedPayload = await cryptoService.encryptText(activeContent, dek);
          await apiClient.updateVaultNodeContent(activeFileId, encryptedPayload, 'text/markdown');
        }

        // Preserve current directory folder path & move/rename if filename changed
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
                  size: activeContent.length,
                  updatedAt: Date.now(),
                }
              : f
          )
        );
      } catch (err) {
        console.error('Auto save to Object Storage error', err);
        showToast(t('autoSaveFailed'), 'error');
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, activeFileId, cmk, isVaultUnlocked]);

  // Generic Node Deletion (File or Folder) for Context Menu
  const handleDeleteNodeByTargetId = async (targetId: string) => {
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
  };

  // Generic Node Download (File or Folder) for Context Menu
  const handleDownloadNodeByTargetId = (targetId: string) => {
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
  };

  // Generic Node Renaming (File or Folder) for Context Menu
  const handleRenameNode = async (nodeId: string, newFilename: string) => {
    const targetNode = files.find((f) => f.id === nodeId);
    if (!targetNode || !newFilename.trim() || targetNode.filename === newFilename.trim()) return;

    const trimmedName = newFilename.trim();
    const isDir = targetNode.mimeType === 'inode/directory';

    // Compute new path in same directory
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
  };

  // Create a new Vault
  const handleCreateVault = (name: string) => {
    const newVault: VaultInfo = {
      id: `vault_${crypto.randomUUID()}`,
      name,
      createdAt: Date.now(),
    };
    setVaults((prev) => [...prev, newVault]);
    setActiveVaultId(newVault.id);
    setActiveFileId(null);
    setActiveTitle('');
    setActiveContent('');
    setSelectedWordCount(0);
    setSelectedCharCount(0);
    showToast(t('createVault'), 'success');
  };

  // Delete an existing Vault
  const handleDeleteVault = async (vaultId: string) => {
    if (vaults.length <= 1) return;

    const vaultToDelete = vaults.find((v) => v.id === vaultId);
    if (!vaultToDelete) return;

    // Delete all nodes associated with this vault
    const vaultFiles = files.filter((f) => f.vaultId === vaultId);
    for (const file of vaultFiles) {
      try {
        await apiClient.deleteVaultNode(file.id);
      } catch (err) {
        console.error('Failed to delete node in vault during vault deletion', err);
      }
    }

    const updatedVaults = vaults.filter((v) => v.id !== vaultId);
    setVaults(updatedVaults);

    const updatedFiles = files.filter((f) => f.vaultId !== vaultId);
    setFiles(updatedFiles);

    // If active vault was deleted, switch to the first remaining vault
    if (activeVaultId === vaultId) {
      const nextVault = updatedVaults[0];
      setActiveVaultId(nextVault.id);
      const inNextVault = updatedFiles.filter(
        (f) => f.vaultId === nextVault.id && f.mimeType !== 'inode/directory'
      );
      if (inNextVault.length > 0) {
        setActiveFileId(inNextVault[0].id);
        setActiveTitle(inNextVault[0].filename);
        setActiveContent(inNextVault[0].content);
      } else {
        setActiveFileId(null);
        setActiveTitle('');
        setActiveContent('');
      }
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    }

    showToast(t('deleteVault'), 'success');
  };

  // Rename an existing Vault
  const handleRenameVault = (vaultId: string, newName: string) => {
    if (!newName.trim()) return;
    setVaults((prev) =>
      prev.map((v) => (v.id === vaultId ? { ...v, name: newName.trim() } : v))
    );
    showToast(t('saved'), 'success');
  };

  // Delete active file
  const handleDeleteFile = async () => {
    if (activeFileId) {
      await handleDeleteNodeByTargetId(activeFileId);
    }
  };

  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const charCount = activeContent.length;

  const activeNotesList: NoteItem[] = activeVaultFiles.map((f) => ({
    ...f,
    title: f.name,
  }));

  return (
    <div className={`flex w-full h-screen gap-4 overflow-hidden ${isDark ? 'dark bg-[#09090B]' : 'bg-[#F4F4F5]'}`}>
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Step 1: Account Login / Register Modal */}
      {!isAuthenticated && <AuthModal />}

      {/* Step 2: Data Vault Unlock Modal */}
      {isAuthenticated && (!isVaultUnlocked || isUnlockModalOpen) && (
        <UnlockModal
          vaults={vaults}
          activeVaultId={activeVaultId}
          onSelectVault={(id) => {
            setActiveVaultId(id);
            const inVault = files.filter((f) => f.vaultId === id && f.mimeType !== 'inode/directory');
            if (inVault.length > 0) {
              setActiveFileId(inVault[0].id);
              setActiveTitle(inVault[0].filename);
              setActiveContent(inVault[0].content);
            } else {
              setActiveFileId(null);
              setActiveTitle('');
              setActiveContent('');
            }
            setSelectedWordCount(0);
            setSelectedCharCount(0);
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      )}

      {/* Step 3: User Profile & Security Settings Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Step 4: Vault Settings Modal */}
      <VaultSettingsModal
        isOpen={isVaultSettingsOpen}
        onClose={() => setIsVaultSettingsOpen(false)}
        vaults={vaults}
        activeVaultId={activeVaultId}
        onSelectVault={(id) => {
          setActiveVaultId(id);
          const inVault = files.filter((f) => f.vaultId === id && f.mimeType !== 'inode/directory');
          if (inVault.length > 0) {
            setActiveFileId(inVault[0].id);
            setActiveTitle(inVault[0].filename);
            setActiveContent(inVault[0].content);
          } else {
            setActiveFileId(null);
            setActiveTitle('');
            setActiveContent('');
          }
          setSelectedWordCount(0);
          setSelectedCharCount(0);
        }}
        onCreateVault={handleCreateVault}
        onRenameVault={handleRenameVault}
        onDeleteVault={handleDeleteVault}
        activeVaultNotes={activeNotesList}
      />

      {/* Step 5: Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        file={activeFile}
        onRevertSuccess={(revertedFileItem, newContent) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === revertedFileItem.id ? revertedFileItem : f))
          );
          setActiveTitle(revertedFileItem.name);
          setActiveContent(newContent);
          showToast(t('saved'), 'success');
        }}
      />

      {/* Main Workspace (Visible when Unlocked) */}
      {isAuthenticated && isVaultUnlocked && (
        <div className="flex-1 flex h-full p-2 sm:p-3 gap-2 sm:gap-3 relative overflow-hidden">
          <SidebarDrawer
            files={activeVaultFiles}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onAddFiles={handleAddFiles}
            onMoveFileToDirectory={handleMoveFileToDirectory}
            onLockVault={lockVault}
            onOpenVaultSettings={() => setIsVaultSettingsOpen(true)}
            onLogoutAccount={logoutAccount}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeVault={activeVault}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNodeByTargetId}
            onDownloadNode={handleDownloadNodeByTargetId}
            isLoadingVaultTree={isLoadingVaultTree}
            isCreatingNote={isCreatingNote}
            isCreatingFolderLoading={isCreatingFolderLoading}
            isDeletingNodeId={isDeletingNodeId}
            isUploadingFiles={isUploadingFiles}
          />

          <section className="flex-1 flex flex-col h-full relative overflow-hidden">
            <EditorCanvas
              activeFile={activeFile}
              title={activeTitle}
              onTitleChange={setActiveTitle}
              content={activeContent}
              onContentChange={handleContentChange}
              isPreview={isPreview}
              isSplitView={isSplitView}
              hasBottomCapsule={isAuthenticated && isVaultUnlocked}
              onDownloadFile={handleDownloadActiveFile}
              onSelectionStatsChange={(selWords, selChars) => {
                setSelectedWordCount(selWords);
                setSelectedCharCount(selChars);
              }}
            />

            <FloatingStatusCapsule
              username={username || 'Markspace User'}
              role={role || 'user'}
              isVaultUnlocked={isVaultUnlocked}
              hasActiveFile={Boolean(activeFileId)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
              wordCount={wordCount}
              charCount={charCount}
              selectedWordCount={selectedWordCount}
              selectedCharCount={selectedCharCount}
              isPreview={isPreview}
              onTogglePreview={() => setIsPreview(!isPreview)}
              isSplitView={isSplitView}
              onToggleSplitView={() => setIsSplitView(!isSplitView)}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
              isSaving={isSaving}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onDownloadCurrentFile={handleDownloadActiveFile}
              onDeleteCurrentFile={handleDeleteFile}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyPast.length > 0}
              canRedo={historyFuture.length > 0}
            />
          </section>
        </div>
      )}
    </div>
  );
};
