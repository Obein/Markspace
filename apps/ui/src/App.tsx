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

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const activeVaultFiles = files.filter((f) => f.vaultId === activeVaultId);
  const activeFile = files.find((f) => f.id === activeFileId) || null;

  // Load and decrypt files when vault is unlocked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    const fetchAndDecryptNotes = async () => {
      try {
        const metadataList = await apiClient.getNotesList();
        const decryptedList: VaultFileItem[] = [];

        for (const meta of metadataList) {
          try {
            const fullNote = await apiClient.getNoteById(meta.id);
            const dek = await cryptoService.unwrapDEK(fullNote.encryptedDek, cmk);
            const title = await cryptoService.decryptText(fullNote.encryptedTitle, dek);
            const content = await cryptoService.decryptText(fullNote.encryptedPayload, dek);

            const baseFilename = sanitizeFilename(title);
            const filename = `${baseFilename}.md`;

            decryptedList.push({
              id: fullNote.id,
              name: title,
              filename,
              path: filename,
              category: 'markdown',
              mimeType: 'text/markdown',
              size: content.length,
              content,
              encryptedTitle: fullNote.encryptedTitle,
              encryptedPayload: fullNote.encryptedPayload,
              encryptedDek: fullNote.encryptedDek,
              vaultId: 'vault_default',
              createdAt: fullNote.createdAt,
              updatedAt: fullNote.updatedAt,
            });
          } catch (err) {
            console.error(`Failed to decrypt file ${meta.id}`, err);
          }
        }

        setFiles(decryptedList);
        if (decryptedList.length > 0) {
          setActiveFileId(decryptedList[0].id);
          setActiveTitle(decryptedList[0].name);
          setActiveContent(decryptedList[0].content);
        }
      } catch (err) {
        console.error('Failed to load files', err);
      }
    };

    fetchAndDecryptNotes();
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  // Sync active file selection
  const handleSelectFile = (id: string) => {
    const selected = files.find((f) => f.id === id);
    if (selected) {
      setActiveFileId(id);
      setActiveTitle(selected.name);
      setActiveContent(selected.content);
    }
  };

  // Ensure unique filename rule (append _xxxx if duplicate)
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
  const handleMoveFileToDirectory = (fileId: string, targetFolderPath: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          const newPath = `${targetFolderPath}/${f.filename}`;
          return { ...f, path: newPath };
        }
        return f;
      })
    );
  };

  // Create a new encrypted Markdown Note
  const handleCreateNote = async () => {
    if (!cmk) return;

    try {
      setIsSaving(true);
      const dek = await cryptoService.generateDEK();
      const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

      const defaultTitle = 'Untitled Note';
      const filename = getUniqueFilename(defaultTitle, '.md');
      const defaultContent = '# Welcome to Markspace\n\nWrite your encrypted notes here.\n\nImages are stored under `/assets` directory e.g. `![Media](assets/sample.png)`.';

      const encryptedTitle = await cryptoService.encryptText(defaultTitle, dek);
      const encryptedPayload = await cryptoService.encryptText(defaultContent, dek);

      const created = await apiClient.createNote(encryptedTitle, encryptedPayload, wrappedDek);

      const newFile: VaultFileItem = {
        id: created.id,
        name: defaultTitle,
        filename,
        path: filename,
        category: 'markdown',
        mimeType: 'text/markdown',
        size: defaultContent.length,
        content: defaultContent,
        encryptedTitle,
        encryptedPayload,
        encryptedDek: wrappedDek,
        vaultId: activeVaultId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setFiles([newFile, ...files]);
      setActiveFileId(newFile.id);
      setActiveTitle(defaultTitle);
      setActiveContent(defaultContent);
    } catch (err) {
      console.error('Failed to create note', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new Directory in Vault
  const handleCreateFolder = (folderName: string) => {
    const cleanFolderName = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanFolderName) return;

    const dummyKeepFile: VaultFileItem = {
      id: `dir_keep_${crypto.randomUUID()}`,
      name: '.keep',
      filename: '.keep',
      path: `${cleanFolderName}/.keep`,
      category: 'markdown',
      mimeType: 'text/plain',
      size: 0,
      content: '# Directory Placeholder',
      encryptedTitle: '',
      encryptedPayload: '',
      encryptedDek: '',
      vaultId: activeVaultId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFiles((prev) => [dummyKeepFile, ...prev]);
  };

  // Add local files / media to Vault (Drag-and-Drop or Add File picker)
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

        if (category === 'markdown') {
          textContent = await file.text();
        } else {
          blobUrl = URL.createObjectURL(file);
          textContent = blobUrl;
        }

        const dek = await cryptoService.generateDEK();
        const wrappedDek = await cryptoService.wrapDEK(dek, cmk);
        const encryptedTitle = await cryptoService.encryptText(file.name, dek);
        const encryptedPayload = await cryptoService.encryptText(textContent, dek);

        const created = await apiClient.createNote(encryptedTitle, encryptedPayload, wrappedDek);

        newFileItems.push({
          id: created.id,
          name: file.name,
          filename,
          path,
          category,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          content: textContent,
          blobUrl,
          encryptedTitle,
          encryptedPayload,
          encryptedDek: wrappedDek,
          vaultId: activeVaultId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error('Failed to add file', file.name, err);
      }
    }

    if (newFileItems.length > 0) {
      setFiles((prev) => [...newFileItems, ...prev]);
      setActiveFileId(newFileItems[0].id);
      setActiveTitle(newFileItems[0].name);
      setActiveContent(newFileItems[0].content);
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

  // Auto-save active file changes with encryption & filename deduplication
  useEffect(() => {
    if (!activeFileId || !cmk || !isVaultUnlocked || activeFile?.category !== 'markdown') return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const existing = files.find((f) => f.id === activeFileId);
        if (!existing) return;

        const updatedFilename = getUniqueFilename(activeTitle, '.md', activeFileId);
        const dek = await cryptoService.unwrapDEK(existing.encryptedDek, cmk);
        const encryptedTitle = await cryptoService.encryptText(activeTitle, dek);
        const encryptedPayload = await cryptoService.encryptText(activeContent, dek);

        await apiClient.updateNote(activeFileId, encryptedTitle, encryptedPayload);

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
        console.error('Auto save error', err);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, activeFileId, cmk, isVaultUnlocked]);

  // Delete file
  const handleDeleteFile = async () => {
    if (!activeFileId) return;

    try {
      await apiClient.deleteNote(activeFileId);
      const updated = files.filter((f) => f.id !== activeFileId);
      setFiles(updated);

      const remainingInVault = updated.filter((f) => f.vaultId === activeVaultId);
      if (remainingInVault.length > 0) {
        setActiveFileId(remainingInVault[0].id);
        setActiveTitle(remainingInVault[0].name);
        setActiveContent(remainingInVault[0].content);
      } else {
        setActiveFileId(null);
        setActiveTitle('');
        setActiveContent('');
      }
    } catch (err) {
      console.error('Failed to delete file', err);
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
          const inVault = files.filter((f) => f.vaultId === id);
          if (inVault.length > 0) {
            setActiveFileId(inVault[0].id);
            setActiveTitle(inVault[0].name);
            setActiveContent(inVault[0].content);
          } else {
            setActiveFileId(null);
            setActiveTitle('');
            setActiveContent('');
          }
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

          <EditorCanvas
            activeFile={activeFile}
            title={activeTitle}
            onTitleChange={setActiveTitle}
            content={activeContent}
            onContentChange={setActiveContent}
            isPreview={isPreview}
            onDownloadFile={handleDownloadActiveFile}
          />
        </>
      )}

      {/* System-wide Floating Status Capsule (Visible whenever Authenticated) */}
      {isAuthenticated && (
        <FloatingStatusCapsule
          username={username}
          role={role}
          isVaultUnlocked={isVaultUnlocked}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
          wordCount={wordCount}
          charCount={charCount}
          isPreview={isPreview}
          onTogglePreview={() => setIsPreview(!isPreview)}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          isSaving={isSaving}
          onDownloadCurrentFile={activeFile ? handleDownloadActiveFile : undefined}
          onDeleteCurrentFile={activeFile ? handleDeleteFile : undefined}
        />
      )}
    </div>
  );
};
