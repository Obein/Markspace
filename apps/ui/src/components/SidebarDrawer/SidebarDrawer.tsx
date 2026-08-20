import React from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';
import { SidebarDrawerProps } from './SidebarDrawer.types';
import { VaultHeader } from './VaultHeader';
import { ActionToolbar } from './ActionToolbar';
import { SearchBar } from './SearchBar';
import { FileTreeItem } from './FileTreeItem';
import { ContextMenu } from './ContextMenu';
import { useSidebarMobileGestures } from './hooks/useSidebarMobileGestures';
import { useSidebarFileTreeInteractions } from './hooks/useSidebarFileTreeInteractions';

/**
 * SidebarDrawer — Composition Root
 *
 * Responsive layout:
 * - md+ (desktop): sliding glass aside with tab collapse handle
 * - <md (mobile): fixed sliding overlay with backdrop blur
 */
export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateNote,
  onCreateFolder,
  onAddFiles,
  onMoveFileToDirectory,
  onLockVault,
  onOpenVaultSettings,
  onLogoutAccount,
  searchQuery,
  onSearchChange,
  activeVault,
  onRenameNode,
  onDeleteNode,
  onDownloadNode,
  isLoadingVaultTree,
  isCreatingNote,
  isCreatingFolderLoading,
  isDeletingNodeId,
  isUploadingFiles,
}) => {
  const { t } = useI18n();

  const { isMobile, isCollapsed, setIsCollapsed, handleMobileSelectFile } =
    useSidebarMobileGestures({
      activeFileId,
      isLoadingVaultTree,
      onSelectFile,
    });

  const {
    isFolderInputOpen,
    setIsFolderInputOpen,
    newFolderName,
    setNewFolderName,
    expandedFolders,
    toggleFolder,
    dragOverFolderPath,
    handleNodeDragStart,
    handleFolderDragOverNode,
    handleFolderDropNode,
    contextMenu,
    setContextMenu,
    confirmDeleteNodeId,
    setConfirmDeleteNodeId,
    handleContextMenu,
    handleTouchStart,
    handleTouchEndOrMove,
    editingNodeId,
    editingName,
    setEditingName,
    handleRenameStart,
    handleRenameSubmit,
    handleCreateFolder,
  } = useSidebarFileTreeInteractions({
    onCreateFolder,
    onMoveFileToDirectory,
    onRenameNode,
  });

  const treeNodes = FileTreeBuilder.buildTree(files);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  // ── Shared inner panel ───────────────────────────────────────────────────────
  const panelContent = (
    <>
      {/* VaultHeader */}
      <VaultHeader
        activeVault={activeVault}
        onOpenVaultSettings={
          onOpenVaultSettings
            ? () => {
                if (isMobile) setIsCollapsed(true);
                onOpenVaultSettings();
              }
            : undefined
        }
        onLockVault={() => {
          if (isMobile) setIsCollapsed(true);
          onLockVault();
        }}
        onLogoutAccount={() => {
          if (isMobile) setIsCollapsed(true);
          onLogoutAccount();
        }}
      />

      {/* ActionToolbar */}
      <ActionToolbar
        isCreatingNote={isCreatingNote}
        isCreatingFolderLoading={isCreatingFolderLoading}
        isUploadingFiles={isUploadingFiles}
        isFolderInputOpen={isFolderInputOpen}
        newFolderName={newFolderName}
        onCreateNote={onCreateNote}
        onCreateFolder={handleCreateFolder}
        onAddFiles={onAddFiles}
        onFolderInputOpen={() => setIsFolderInputOpen(true)}
        onFolderInputClose={() => {
          setIsFolderInputOpen(false);
          setNewFolderName('');
        }}
        onNewFolderNameChange={setNewFolderName}
      />

      {/* SearchBar */}
      <SearchBar value={searchQuery} onChange={onSearchChange} />

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {isLoadingVaultTree ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primaryColor-600 dark:text-primaryColor-400" />
            <span>{t('loadingVaultTree')}</span>
          </div>
        ) : treeNodes.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs font-mono">
            {t('noFilesFound')}
          </div>
        ) : (
          <FileTreeItem
            nodes={treeNodes}
            activeFileId={activeFileId}
            expandedFolders={expandedFolders}
            dragOverFolderPath={dragOverFolderPath}
            editingNodeId={editingNodeId}
            editingName={editingName}
            isDeletingNodeId={isDeletingNodeId}
            onSelectFile={handleMobileSelectFile}
            onToggleFolder={toggleFolder}
            onRenameSubmit={handleRenameSubmit}
            onCancelRename={() => {}}
            onEditingNameChange={setEditingName}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEndOrMove={handleTouchEndOrMove}
            onNodeDragStart={handleNodeDragStart}
            onFolderDragOverNode={handleFolderDragOverNode}
            onFolderDragLeaveNode={() => {}}
            onFolderDropNode={handleFolderDropNode}
          />
        )}
      </div>

      {/* ContextMenu */}
      {contextMenu && (
        <ContextMenu
          contextMenu={contextMenu}
          confirmDeleteNodeId={confirmDeleteNodeId}
          isDeletingNodeId={isDeletingNodeId}
          onClose={() => setContextMenu(null)}
          onDownload={onDownloadNode}
          onRenameStart={onRenameNode ? handleRenameStart : undefined}
          onDeleteRequest={setConfirmDeleteNodeId}
          onDeleteConfirm={(nodeId) => onDeleteNode?.(nodeId)}
          onDeleteCancel={() => setConfirmDeleteNodeId(null)}
        />
      )}
    </>
  );

  // ── Desktop Chrome Tab-style Collapse Handle ──────────────────────────────
  const collapseHandle = (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
      }}
      className={`absolute -right-6 top-1/2 -translate-y-1/2 z-40 cursor-pointer flex items-center justify-center select-none transition-opacity duration-200 ${
        isCollapsed ? 'opacity-95 hover:opacity-100' : 'opacity-70 hover:opacity-100'
      }`}
      title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
    >
      <div className="relative w-6 h-20 bg-white/95 dark:bg-[#18181b]/95 border border-l-0 border-black/15 dark:border-white/15 rounded-r-2xl shadow-xl flex flex-col items-center justify-center gap-2.5 backdrop-blur-xl">
        <div className="w-1 h-3 rounded-full bg-black/25 dark:bg-white/30" />
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
        )}
        <div className="w-1 h-3 rounded-full bg-black/25 dark:bg-white/30" />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: backdrop (closes sidebar on tap) */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Mobile: sliding side panel — fixed overlay with frosted blur, no handle */}
      {isMobile && (
        <aside
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`glass-panel backdrop-blur-xl bg-white/90 dark:bg-[#141418]/90 rounded-r-2xl flex flex-col select-none h-full w-72 sm:w-80 fixed top-0 left-0 z-[60] transition-transform duration-300 ease-in-out overflow-visible ${
            isCollapsed
              ? '-translate-x-[calc(100%-14px)] cursor-pointer'
              : 'translate-x-0'
          }`}
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
          }}
        >
          {panelContent}
        </aside>
      )}

      {/* Layout Slot (Mobile & Desktop) */}
      <div
        className={`relative h-full shrink-0 transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? 'w-3.5' : 'w-3.5 md:w-72 md:lg:w-80'
        }`}
      >
        {/* Desktop aside inside the slot */}
        <aside
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`hidden md:flex glass-panel rounded-glass-lg flex-col select-none h-full w-72 lg:w-80 absolute top-0 left-0 transition-transform duration-300 ease-in-out overflow-visible ${
            isCollapsed
              ? '-translate-x-[calc(100%-14px)] hover:-translate-x-[calc(100%-18px)] cursor-pointer'
              : 'translate-x-0'
          }`}
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
          }}
        >
          {collapseHandle}
          {panelContent}
        </aside>
      </div>
    </>
  );
};
