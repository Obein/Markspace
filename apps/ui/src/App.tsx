import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { EditorCanvas } from './components/EditorCanvas';
import { FloatingStatusCapsule } from './components/FloatingStatusCapsule';
import { SidebarDrawer } from './components/SidebarDrawer';
import { UnlockModal } from './components/UnlockModal';
import { useApp } from './context/AppContext';
import { NoteItem } from './interfaces/INoteModels';

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

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load and decrypt notes when vault is unlocked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    const fetchAndDecryptNotes = async () => {
      try {
        const metadataList = await apiClient.getNotesList();
        const decryptedList: NoteItem[] = [];

        for (const meta of metadataList) {
          try {
            const fullNote = await apiClient.getNoteById(meta.id);
            const dek = await cryptoService.unwrapDEK(fullNote.encryptedDek, cmk);
            const title = await cryptoService.decryptText(fullNote.encryptedTitle, dek);
            const content = await cryptoService.decryptText(fullNote.encryptedPayload, dek);

            decryptedList.push({
              id: fullNote.id,
              title,
              content,
              encryptedTitle: fullNote.encryptedTitle,
              encryptedDek: fullNote.encryptedDek,
              createdAt: fullNote.createdAt,
              updatedAt: fullNote.updatedAt,
            });
          } catch (err) {
            console.error(`Failed to decrypt note ${meta.id}`, err);
          }
        }

        setNotes(decryptedList);
        if (decryptedList.length > 0) {
          setActiveNoteId(decryptedList[0].id);
          setActiveTitle(decryptedList[0].title);
          setActiveContent(decryptedList[0].content);
        }
      } catch (err) {
        console.error('Failed to load notes', err);
      }
    };

    fetchAndDecryptNotes();
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  // Sync active note state when selection changes
  const handleSelectNote = (id: string) => {
    const selected = notes.find((n) => n.id === id);
    if (selected) {
      setActiveNoteId(id);
      setActiveTitle(selected.title);
      setActiveContent(selected.content);
    }
  };

  // Create a new encrypted note
  const handleCreateNote = async () => {
    if (!cmk) return;

    try {
      setIsSaving(true);
      const dek = await cryptoService.generateDEK();
      const wrappedDek = await cryptoService.wrapDEK(dek, cmk);

      const defaultTitle = 'Untitled Note';
      const defaultContent = '# Welcome to Markspace\n\nWrite your encrypted notes here.';

      const encryptedTitle = await cryptoService.encryptText(defaultTitle, dek);
      const encryptedPayload = await cryptoService.encryptText(defaultContent, dek);

      const created = await apiClient.createNote(encryptedTitle, encryptedPayload, wrappedDek);

      const newNote: NoteItem = {
        id: created.id,
        title: defaultTitle,
        content: defaultContent,
        encryptedTitle,
        encryptedDek: wrappedDek,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      setActiveTitle(defaultTitle);
      setActiveContent(defaultContent);
    } catch (err) {
      console.error('Failed to create note', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save active note changes with encryption
  useEffect(() => {
    if (!activeNoteId || !cmk || !isVaultUnlocked) return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const existing = notes.find((n) => n.id === activeNoteId);
        if (!existing) return;

        const dek = await cryptoService.unwrapDEK(existing.encryptedDek, cmk);
        const encryptedTitle = await cryptoService.encryptText(activeTitle, dek);
        const encryptedPayload = await cryptoService.encryptText(activeContent, dek);

        await apiClient.updateNote(activeNoteId, encryptedTitle, encryptedPayload);

        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeNoteId
              ? { ...n, title: activeTitle, content: activeContent, updatedAt: Date.now() }
              : n
          )
        );
      } catch (err) {
        console.error('Auto save error', err);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, activeNoteId, cmk, isVaultUnlocked]);

  // Delete note
  const handleDeleteNote = async () => {
    if (!activeNoteId) return;

    try {
      await apiClient.deleteNote(activeNoteId);
      const updated = notes.filter((n) => n.id !== activeNoteId);
      setNotes(updated);

      if (updated.length > 0) {
        setActiveNoteId(updated[0].id);
        setActiveTitle(updated[0].title);
        setActiveContent(updated[0].content);
      } else {
        setActiveNoteId(null);
        setActiveTitle('');
        setActiveContent('');
      }
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const charCount = activeContent.length;

  return (
    <div className={`flex w-full h-screen overflow-hidden ${isDark ? 'dark bg-[#09090B]' : 'bg-[#F4F4F5]'}`}>
      {/* Step 1: Account Login / Register Modal */}
      {!isAuthenticated && <AuthModal />}

      {/* Step 2: Data Vault Unlock Modal */}
      {isAuthenticated && !isVaultUnlocked && <UnlockModal />}

      {/* Step 3: Main Application Workspace */}
      {isAuthenticated && isVaultUnlocked && (
        <>
          <SidebarDrawer
            notes={notes}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onLockVault={lockVault}
            onLogoutAccount={logoutAccount}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            username={username}
            role={role}
          />

          <EditorCanvas
            title={activeTitle}
            onTitleChange={setActiveTitle}
            content={activeContent}
            onContentChange={setActiveContent}
            isPreview={isPreview}
            onDeleteNote={handleDeleteNote}
          />

          <FloatingStatusCapsule
            wordCount={wordCount}
            charCount={charCount}
            isPreview={isPreview}
            onTogglePreview={() => setIsPreview(!isPreview)}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            isSaving={isSaving}
          />
        </>
      )}
    </div>
  );
};
