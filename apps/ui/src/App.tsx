import React, { useState, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
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
    systemConfigErrors,
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
    handleUpdateVaultStorageConfig,
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
    isDecryptingFile,
    decryptingFileName,
    decryptingFileId,
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

      {/* System Configuration Blocker: Blocks application when keys do not meet specification */}
      {systemConfigErrors && systemConfigErrors.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#121216] border border-amber-500/40 shadow-2xl text-white text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
              服务端密钥配置不符合规格
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 max-w-md">
              检测到当前服务端的加密密钥或签名密钥未满足安全规范（要求必须 ≥ 30 字符）。由于密钥不符合规格，为确保数据与会话安全，应用已暂停使用。
            </p>

            <div className="w-full p-3.5 bg-black/50 border border-white/10 rounded-2xl mb-4 text-left font-mono text-xs space-y-2">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-sans font-semibold mb-1 flex items-center justify-between">
                <span>异常项检测 (Diagnostic Errors)</span>
                <span className="text-amber-400 font-mono text-[10px]">规范: ≥ 30 字符</span>
              </div>
              {systemConfigErrors.map((err, i) => (
                <div key={i} className="text-red-300 flex items-start gap-2 leading-relaxed bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="break-all">{err}</span>
                </div>
              ))}
            </div>

            <div className="w-full p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl mb-5 text-left text-xs text-zinc-400 space-y-1.5 leading-relaxed font-mono">
              <div className="text-zinc-300 font-semibold mb-0.5 font-sans">管理员配置指引：</div>
              <div className="text-[11px] text-zinc-400">
                1. 在 Cloudflare 控制台（Workers &gt; 设置 &gt; 变量和机密）配置合规机密；
              </div>
              <div className="text-[11px] text-zinc-400">
                2. 或通过 Wrangler 命令行写入至少 30 字符的高熵密钥：
              </div>
              <div className="bg-black/60 p-2 rounded-xl text-amber-300 text-[11px] space-y-1 select-all border border-white/5">
                <div>npx wrangler secret put JWT_SECRET</div>
                <div>npx wrangler secret put MEK_v1</div>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重新检测并刷新</span>
            </button>
          </div>
        </div>
      )}

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
            onUpdateVaultStorageConfig={handleUpdateVaultStorageConfig}
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
            decryptingFileId={decryptingFileId}
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
              isDecryptingFile={isDecryptingFile}
              decryptingFileName={decryptingFileName}
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
