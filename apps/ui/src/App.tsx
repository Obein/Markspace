import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { EditorCanvas } from './components/EditorCanvas';
import { FloatingStatusCapsule } from './components/FloatingStatusCapsule';
import { SidebarDrawer } from './components/SidebarDrawer';
import { UnlockModal } from './components/UnlockModal';
import { UserProfileModal } from './components/UserProfileModal';
import { useApp } from './context/AppContext';
import { NoteItem, VaultFileItem, VaultInfo } from './interfaces/INoteModels';
import { FileTreeBuilder } from './utils/FileTreeBuilder';

function generateRandom4Chars(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeFilename(title: string): string {
  const clean = title.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');
  return clean || 'note';
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

  const [vaults, setVaults] = useState<VaultInfo[]>([
    { id: 'vault_default', name: 'Main Vault', createdAt: Date.now() },
  ]);
  const [activeVaultId, setActiveVaultId] = useState<string>('vault_default');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedWordCount, setSelectedWordCount] = useState(0);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const activeVaultFiles = files.filter((f) => f.vaultId === activeVaultId);
  const activeFile = files.find((f) => f.id === activeFileId) || null;

  // Load Vault File Tree and fetch Object Storage content when unlocked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    const fetchAndDecryptVaultTree = async () => {
      try {
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
              vaultId: 'vault_default',
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

            decryptedList.push({
              id: node.id,
              name: node.name,
              filename: node.name,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: node.size,
              content: contentText,
              blobUrl,
              encryptedTitle: node.name,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
          } catch (err) {
            console.error(`Failed to decrypt file content for node ${node.id}`, err);
          }
        }

        setFiles(decryptedList);
        const fileOnlyList = decryptedList.filter((f) => f.mimeType !== 'inode/directory');
        if (fileOnlyList.length > 0) {
          setActiveFileId(fileOnlyList[0].id);
          setActiveTitle(fileOnlyList[0].name);
          setActiveContent(fileOnlyList[0].content);
        }
      } catch (err) {
        console.error('Failed to load Vault tree from backend', err);
      }
    };

    fetchAndDecryptVaultTree();
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  // Sync active file selection
  const handleSelectFile = (id: string) => {
    const selected = files.find((f) => f.id === id);
    if (selected) {
      setActiveFileId(id);
      setActiveTitle(selected.name);
      setActiveContent(selected.content);
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    }
  };

  // Ensure unique filename rule
  const getUniqueFilename = (baseTitle: string, ext = '.md', currentFileId?: string): string => {
    const sanitized = sanitizeFilename(baseTitle);
    let candidate = `${sanitized}${ext}`;

    const isDuplicate = files.some(
      (f) => f.vaultId === activeVaultId && f.id !== currentFileId && f.filename === candidate
    );

    if (isDuplicate) {
      candidate = `${sanitized}_${generateRandom4Chars()}${ext}`;
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
    }
  };

  // Create a new encrypted Markdown Note (Stored in R2 Object Storage)
  const handleCreateNote = async () => {
    if (!cmk) return;

    try {
      setIsSaving(true);
      const dek = await cryptoService.generateDEK();
      const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

      const defaultTitle = 'Untitled Note';
      const filename = getUniqueFilename(defaultTitle, '.md');
      const defaultContent = '# Welcome to Markspace\n\nWrite your encrypted notes here.\n\nImages are stored under `/assets` directory e.g. `![Media](assets/sample.png)`.';

      const encryptedPayload = await cryptoService.encryptText(defaultContent, dek);

      const createdNode = await apiClient.createVaultNode({
        path: filename,
        name: defaultTitle,
        isDirectory: false,
        encryptedDek: wrappedDek,
        mimeType: 'text/markdown',
        category: 'markdown',
        contentBlob: encryptedPayload,
      });

      const newFile: VaultFileItem = {
        id: createdNode.id,
        name: defaultTitle,
        filename,
        path: filename,
        category: 'markdown',
        mimeType: 'text/markdown',
        size: defaultContent.length,
        content: defaultContent,
        encryptedTitle: defaultTitle,
        encryptedPayload,
        encryptedDek: wrappedDek,
        vaultId: activeVaultId,
        createdAt: createdNode.createdAt,
        updatedAt: createdNode.updatedAt,
      };

      setFiles([newFile, ...files]);
      setActiveFileId(newFile.id);
      setActiveTitle(defaultTitle);
      setActiveContent(defaultContent);
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    } catch (err) {
      console.error('Failed to create note in Object Storage', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new Directory Node in Vault
  const handleCreateFolder = async (folderName: string) => {
    const cleanFolderName = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanFolderName || !cmk) return;

    try {
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
    }
  };

  // Add local files / media to Vault & Object Storage
  const handleAddFiles = async (inputFiles: FileList | File[]) => {
    if (!cmk) return;

    const fileList = Array.from(inputFiles);
    const newFileItems: VaultFileItem[] = [];

    for (const file of fileList) {
      try {
        const category = FileTreeBuilder.detectCategory(file.name, file.type);
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
  };

  // Create a new Vault
  const handleCreateVault = (vaultName: string) => {
    const newVault: VaultInfo = {
      id: `vault_${crypto.randomUUID()}`,
      name: vaultName,
      createdAt: Date.now(),
    };
    setVaults([...vaults, newVault]);
    setActiveVaultId(newVault.id);
  };

  // Download active file to local disk
  const handleDownloadActiveFile = () => {
    if (!activeFile) return;

    if (activeFile.blobUrl) {
      const a = document.createElement('a');
      a.href = activeFile.blobUrl;
      a.download = activeFile.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([activeContent], { type: activeFile.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Auto-save active file payload changes into R2 Object Storage
  useEffect(() => {
    if (!activeFileId || !cmk || !isVaultUnlocked || activeFile?.category !== 'markdown') return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const existing = files.find((f) => f.id === activeFileId);
        if (!existing) return;

        const updatedFilename = getUniqueFilename(activeTitle, '.md', activeFileId);
        const dek = await cryptoService.unwrapDEK(existing.encryptedDek, cmk);
        const encryptedPayload = await cryptoService.encryptText(activeContent, dek);

        await apiClient.updateVaultNodeContent(activeFileId, encryptedPayload, 'text/markdown');

        setFiles((prev) =>
          prev.map((f) =>
            f.id === activeFileId
              ? {
                  ...f,
                  name: activeTitle,
                  filename: updatedFilename,
                  path: updatedFilename,
                  content: activeContent,
                  size: activeContent.length,
                  updatedAt: Date.now(),
                }
              : f
          )
        );
      } catch (err) {
        console.error('Auto save to Object Storage error', err);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, activeFileId, cmk, isVaultUnlocked]);

  // Delete file or folder node from Vault and Object Storage
  const handleDeleteFile = async () => {
    if (!activeFileId) return;

    try {
      await apiClient.deleteVaultNode(activeFileId);
      const updated = files.filter((f) => f.id !== activeFileId);
      setFiles(updated);

      const remainingInVault = updated.filter(
        (f) => f.vaultId === activeVaultId && f.mimeType !== 'inode/directory'
      );
      if (remainingInVault.length > 0) {
        setActiveFileId(remainingInVault[0].id);
        setActiveTitle(remainingInVault[0].name);
        setActiveContent(remainingInVault[0].content);
      } else {
        setActiveFileId(null);
        setActiveTitle('');
        setActiveContent('');
      }
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const charCount = activeContent.length;

  const activeNotesList: NoteItem[] = activeVaultFiles.map((f) => ({
    ...f,
    title: f.name,
  }));

  return (
    <div className={`flex w-full h-screen p-4 gap-4 overflow-hidden ${isDark ? 'dark bg-[#09090B]' : 'bg-[#F4F4F5]'}`}>
      {/* Step 1: Account Login / Register Modal */}
      {!isAuthenticated && <AuthModal />}

      {/* Step 2: Data Vault Unlock Modal */}
      {isAuthenticated && (!isVaultUnlocked || isUnlockModalOpen) && (
        <UnlockModal />
      )}

      {/* User Profile & Vault Settings Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        vaults={vaults}
        activeVaultId={activeVaultId}
        onSelectVault={(id) => {
          setActiveVaultId(id);
          const inVault = files.filter((f) => f.vaultId === id && f.mimeType !== 'inode/directory');
          if (inVault.length > 0) {
            setActiveFileId(inVault[0].id);
            setActiveTitle(inVault[0].name);
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
        activeVaultNotes={activeNotesList}
      />

      {/* Main Workspace (Visible when Unlocked) */}
      {isAuthenticated && isVaultUnlocked && (
        <>
          <SidebarDrawer
            files={activeVaultFiles}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onAddFiles={handleAddFiles}
            onMoveFileToDirectory={handleMoveFileToDirectory}
            onLockVault={lockVault}
            onLogoutAccount={logoutAccount}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeVault={activeVault}
          />

          <section className="flex-1 flex flex-col h-full relative overflow-hidden">
            <EditorCanvas
              activeFile={activeFile}
              title={activeTitle}
              onTitleChange={setActiveTitle}
              content={activeContent}
              onContentChange={setActiveContent}
              isPreview={isPreview}
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
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
              wordCount={wordCount}
              charCount={charCount}
              selectedWordCount={selectedWordCount}
              selectedCharCount={selectedCharCount}
              isPreview={isPreview}
              onTogglePreview={() => setIsPreview(!isPreview)}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
              isSaving={isSaving}
              onDownloadCurrentFile={handleDownloadActiveFile}
              onDeleteCurrentFile={handleDeleteFile}
            />
          </section>
        </>
      )}
    </div>
  );
};
