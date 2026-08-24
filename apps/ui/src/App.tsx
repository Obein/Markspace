import React, { useState, useCallback } from 'react';
import {
  AuthModal,
  EditorCanvas,
  FloatingStatusCapsule,
  SidebarDrawer,
  ToastContainer,
  UnlockModal,
  UserProfileModal,
  AdminModal,
  VaultSettingsModal,
  VersionHistoryModal,
} from './components';
import { useApp } from './context/AppContext';
import { useI18n } from './i18n/i18nContext';
import { NoteItem } from './interfaces/INoteModels';
import { useToast, useTheme, useModals, useVaults, useVaultFiles, useAutoLock } from './hooks';

export const AppContent: React.FC = () => {
  const {
    apiClient,
    isAuthenticated,
    isInitializingAuth,
    isVaultUnlocked,
    username,
    role,
    lockVault,
    logoutAccount,
  } = useApp();

  const { t } = useI18n();
  const { toasts, showToast, dismissToast } = useToast();
  const { isDark, toggleTheme, accentColor, setAccentColor, customHex, setCustomHex } = useTheme(username);

  // Auto-Lock / Auto-Logout Hook for Inactivity Timeout
  const {
    autoLockEnabled,
    setAutoLockEnabled,
    autoLockMinutes,
    setAutoLockMinutes,
    autoLockAction,
    setAutoLockAction,
  } = useAutoLock({
    username,
    isVaultUnlocked,
    onLockVault: () => lockVault(activeVaultId),
    onLogout: () => logoutAccount(),
    onAutoLocked: (action) =>
      showToast(
        action === 'logout'
          ? (t('sessionAutoLoggedOut') || '已因长时间无操作自动安全登出')
          : t('vaultAutoLocked'),
        'info'
      ),
  });
  const {
    isProfileOpen,
    openProfile,
    closeProfile,
    isAdminOpen,
    openAdmin,
    closeAdmin,
    isVaultSettingsOpen,
    openVaultSettings,
    closeVaultSettings,
    isUnlockModalOpen,
    openUnlockModal,
    isHistoryOpen,
    openHistory,
    closeHistory,
  } = useModals();

  const [isPreview, setIsPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  // Vault CRUD & Switching Hook
  const {
    vaults,
    activeVaultId,
    setActiveVaultId,
    activeVault,
    handleCreateVault,
    handleUnlockVaultWithPasskey,
    handleUnlockVaultWithRecovery,
    handleRenameVault,
    handleDeleteVault,
  } = useVaults({
    username,
    t,
    showToast,
    onDeleteVaultNodes: async (vaultId: string) => {
      const vaultFiles = files.filter((f) => f.vaultId === vaultId);
      for (const file of vaultFiles) {
        try {
          await apiClient.deleteVaultNode(file.id);
        } catch (err) {
          console.error('Failed to delete node during vault purge', err);
        }
      }
    },
    onVaultDeleted: (deletedVaultId: string, nextVaultId: string) => {
      setFiles((prev) => prev.filter((f) => f.vaultId !== deletedVaultId));
      const remainingInNextVault = files.filter(
        (f) => f.vaultId === nextVaultId && f.mimeType !== 'inode/directory'
      );
      if (remainingInNextVault.length > 0) {
        setActiveFileId(remainingInNextVault[0].id);
        setActiveTitle(remainingInNextVault[0].filename);
        setActiveContent(remainingInNextVault[0].content);
      } else {
        setActiveFileId(null);
        setActiveTitle('');
        setActiveContent('');
      }
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    },
  });

  // Vault File & Node Management Hook
  const {
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
    handleRetrySave,
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
  } = useVaultFiles({
    activeVaultId,
    showToast,
  });

  const handleSelectVaultInModals = useCallback(
    (id: string) => {
      setActiveVaultId(id);
      const inVault = files.filter(
        (f) => f.vaultId === id && f.mimeType !== 'inode/directory'
      );
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
    },
    [files, setActiveVaultId, setActiveFileId, setActiveTitle, setActiveContent, setSelectedWordCount, setSelectedCharCount]
  );

  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const charCount = activeContent.length;

  const activeNotesList: NoteItem[] = activeVaultFiles.map((f) => ({
    ...f,
    title: f.name,
  }));

  return (
    <div className={`flex w-full h-full overflow-hidden ${isDark ? 'dark bg-[#09090B]' : 'bg-[#F4F4F5]'}`}>
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Step 1: Account Login / Register Modal */}
      {!isAuthenticated && !isInitializingAuth && <AuthModal />}

      {/* Step 2: Data Vault Unlock Modal */}
      {(isAuthenticated || (isInitializingAuth && Boolean(username))) &&
        (!isVaultUnlocked || isUnlockModalOpen) &&
        !isProfileOpen &&
        !isAdminOpen &&
        !isVaultSettingsOpen &&
        !isHistoryOpen && (
          <UnlockModal
            vaults={vaults}
            activeVaultId={activeVaultId}
            onSelectVault={handleSelectVaultInModals}
            onOpenProfile={openProfile}
            onCreateVault={handleCreateVault}
            onDeleteVault={handleDeleteVault}
            onUnlockVaultWithPasskey={handleUnlockVaultWithPasskey}
            onUnlockVaultWithRecovery={handleUnlockVaultWithRecovery}
          />
        )}

      {/* Step 3: User Profile & Security Settings Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={closeProfile}
        autoLockEnabled={autoLockEnabled}
        onToggleAutoLock={setAutoLockEnabled}
        autoLockMinutes={autoLockMinutes}
        onChangeAutoLockMinutes={setAutoLockMinutes}
        autoLockAction={autoLockAction}
        onChangeAutoLockAction={setAutoLockAction}
        accentColor={accentColor}
        onSelectAccentColor={setAccentColor}
        customHex={customHex}
        onSelectCustomHex={setCustomHex}
      />

      {/* Step 3.5: Dedicated System Administration Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={closeAdmin}
      />

      {/* Step 4: Vault Settings Modal */}
      <VaultSettingsModal
        isOpen={isVaultSettingsOpen}
        onClose={closeVaultSettings}
        vaults={vaults}
        activeVaultId={activeVaultId}
        onSelectVault={handleSelectVaultInModals}
        onCreateVault={handleCreateVault}
        onRenameVault={handleRenameVault}
        onDeleteVault={handleDeleteVault}
        activeVaultNotes={activeNotesList}
      />

      {/* Step 5: Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={closeHistory}
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
            onLockVault={() => lockVault(activeVaultId)}
            onOpenVaultSettings={openVaultSettings}
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
              onOpenProfile={openProfile}
              onOpenAdmin={openAdmin}
              onOpenUnlockModal={openUnlockModal}
              wordCount={wordCount}
              charCount={charCount}
              selectedWordCount={selectedWordCount}
              selectedCharCount={selectedCharCount}
              isPreview={isPreview}
              onTogglePreview={() => setIsPreview(!isPreview)}
              isSplitView={isSplitView}
              onToggleSplitView={() => setIsSplitView(!isSplitView)}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              isSaving={isSaving}
              isSaveFailed={isSaveFailed}
              onRetrySave={handleRetrySave}
              onOpenHistory={openHistory}
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
