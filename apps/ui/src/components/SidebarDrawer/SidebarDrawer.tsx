import React, { useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';
import { SidebarDrawerProps, ContextMenuState } from './SidebarDrawer.types';
import { VaultHeader } from './VaultHeader';
import { ActionToolbar } from './ActionToolbar';
import { SearchBar } from './SearchBar';
import { FileTreeItem } from './FileTreeItem';
import { ContextMenu } from './ContextMenu';

/**
 * SidebarDrawer — Composition Root
 *
 * Owns all shared state and event wiring; delegates every visual concern
 * to purpose-built sub-components:
 *
 *  ┌─ VaultHeader       (branding, vault name, lock/logout actions)
 *  ├─ ActionToolbar     (new note · new folder · upload + inline folder form)
 *  ├─ SearchBar         (live file-tree filter)
 *  ├─ FileTreeItem      (recursive tree renderer with drag-and-drop)
 *  └─ ContextMenu       (right-click / long-press popover)
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

  // ── Sidebar collapse ────────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Inline folder creation form ─────────────────────────────────────────────
  const [isFolderInputOpen, setIsFolderInputOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // ── File tree interaction ───────────────────────────────────────────────────
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  // ── Inline rename ───────────────────────────────────────────────────────────
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // ── Context menu ────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null);

  // Long-press detection timer for touch devices
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const treeNodes = FileTreeBuilder.buildTree(files);

  // ── Folder expand / collapse ────────────────────────────────────────────────
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === false ? true : false,
    }));
  };

  // ── Drag-and-drop (sidebar-level drop zone) ─────────────────────────────────
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

  // ── Tree node drag-and-drop ─────────────────────────────────────────────────
  const handleNodeDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId);
  };

  const handleFolderDragOverNode = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPath(folderPath);
  };

  const handleFolderDropNode = (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPath(null);
    const draggedFileId = e.dataTransfer.getData('text/plain');
    if (draggedFileId) {
      onMoveFileToDirectory(draggedFileId, targetFolderPath);
    }
  };

  // ── Context menu open (right-click) ─────────────────────────────────────────
  const handleContextMenu = (
    e: React.MouseEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteNodeId(null);
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, nodeName, nodePath, isDirectory, fileItem });
  };

  // ── Context menu open (long-press / touch) ───────────────────────────────────
  const handleTouchStart = (
    e: React.TouchEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => {
    const { clientX: touchX, clientY: touchY } = e.touches[0];
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setConfirmDeleteNodeId(null);
      setContextMenu({ x: touchX, y: touchY, nodeId, nodeName, nodePath, isDirectory, fileItem });
    }, 550);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // ── Inline rename ───────────────────────────────────────────────────────────
  const handleRenameStart = (nodeId: string, initialName: string) => {
    setEditingNodeId(nodeId);
    setEditingName(initialName);
  };

  const handleRenameSubmit = (nodeId: string, newName: string) => {
    if (onRenameNode && newName.trim()) {
      onRenameNode(nodeId, newName.trim());
    }
    setEditingNodeId(null);
  };

  // ── Create folder (ActionToolbar callback) ───────────────────────────────────
  const handleCreateFolder = (name: string) => {
    onCreateFolder(name);
    setNewFolderName('');
  };

  return (
    /* Outer Layout Slot — adjusts width without squishing inner panel,
       maintains the peek strip when the sidebar is collapsed */
    <div
      className={`relative h-full shrink-0 transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-3.5 sm:w-4' : 'w-72 sm:w-80'
      }`}
    >
      {/* Solid Inner Panel with Rigid Width & Smooth Translation */}
      <aside
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`glass-panel rounded-glass-lg flex flex-col select-none h-full w-72 sm:w-80 absolute top-0 left-0 transition-transform duration-300 ease-in-out overflow-visible ${
          isCollapsed
            ? '-translate-x-[calc(100%-14px)] hover:-translate-x-[calc(100%-18px)] cursor-pointer'
            : 'translate-x-0'
        }`}
        onClick={() => {
          if (isCollapsed) setIsCollapsed(false);
        }}
      >
        {/* Chrome Tab-style Collapse Handle (attached to the right border) */}
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

        {/* ── VaultHeader ─────────────────────────────────────────────────── */}
        <VaultHeader
          activeVault={activeVault}
          onOpenVaultSettings={onOpenVaultSettings}
          onLockVault={onLockVault}
          onLogoutAccount={onLogoutAccount}
        />

        {/* ── ActionToolbar (New Note · New Folder · Upload) ───────────────── */}
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

        {/* ── SearchBar ────────────────────────────────────────────────────── */}
        <SearchBar value={searchQuery} onChange={onSearchChange} />

        {/* ── File Tree Explorer (Hierarchical) ────────────────────────────── */}
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
              onSelectFile={onSelectFile}
              onToggleFolder={toggleFolder}
              onRenameSubmit={handleRenameSubmit}
              onCancelRename={() => setEditingNodeId(null)}
              onEditingNameChange={setEditingName}
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEndOrMove={handleTouchEndOrMove}
              onNodeDragStart={handleNodeDragStart}
              onFolderDragOverNode={handleFolderDragOverNode}
              onFolderDragLeaveNode={() => setDragOverFolderPath(null)}
              onFolderDropNode={handleFolderDropNode}
            />
          )}
        </div>

        {/* ── ContextMenu (right-click / long-press) ───────────────────────── */}
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
      </aside>
    </div>
  );
};
