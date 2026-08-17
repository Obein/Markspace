import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import {
  generateRandom4Chars,
  sanitizeFilename,
  downloadSingleFile,
} from '../../utils/fileHelpers';

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

export interface UseVaultFileOperationsReturn {
  isCreatingNote: boolean;
  isCreatingFolderLoading: boolean;
  isDeletingNodeId: string | null;
  isUploadingFiles: boolean;
  getUniqueFilename: (baseTitle: string, ext?: string, currentFileId?: string) => string;
  handleCreateNote: () => Promise<void>;
  handleCreateFolder: (folderName: string) => Promise<void>;
  handleAddFiles: (inputFiles: FileList | File[]) => Promise<void>;
  handleMoveFileToDirectory: (fileId: string, targetFolderPath: string) => Promise<void>;
  handleDeleteNodeByTargetId: (targetId: string) => Promise<void>;
  handleDownloadNodeByTargetId: (targetId: string) => void;
  handleDownloadActiveFile: () => void;
  handleRenameNode: (nodeId: string, newFilename: string) => Promise<void>;
  handleDeleteFile: () => Promise<void>;
}

export function useVaultFileOperations({
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
}: UseVaultFileOperationsOptions): UseVaultFileOperationsReturn {
  const { cryptoService, apiClient, cmk } = useApp();
  const { t } = useI18n();

  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);
  const [isDeletingNodeId, setIsDeletingNodeId] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

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
    [files, apiClient, setFiles, showToast, t]
  );

  const handleCreateNote = useCallback(async () => {
    if (!cmk || isCreatingNote) return;

    try {
      setIsCreatingNote(true);
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

  const handleDownloadActiveFile = useCallback(() => {
    if (activeFile) {
      downloadSingleFile(activeFile);
    }
  }, [activeFile]);

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
    [files, apiClient, activeFileId, setFiles, setActiveTitle, showToast, t]
  );

  const handleDeleteFile = useCallback(async () => {
    if (activeFileId) {
      await handleDeleteNodeByTargetId(activeFileId);
    }
  }, [activeFileId, handleDeleteNodeByTargetId]);

  return {
    isCreatingNote,
    isCreatingFolderLoading,
    isDeletingNodeId,
    isUploadingFiles,
    getUniqueFilename,
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
