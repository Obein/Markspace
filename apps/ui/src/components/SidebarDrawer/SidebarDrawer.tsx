import React, { useRef, useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  Upload,
  FolderPlus,
  X,
  Check,
  Download,
  Trash2,
  Edit2,
  Loader2,
  Folder,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';
import { SidebarDrawerProps, ContextMenuState } from './SidebarDrawer.types';
import { VaultHeader } from './VaultHeader';
import { FileTreeItem } from './FileTreeItem';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFolderInputOpen, setIsFolderInputOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const treeNodes = FileTreeBuilder.buildTree(files);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === false ? true : false,
    }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsFolderInputOpen(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      nodeName,
      nodePath,
      isDirectory,
      fileItem,
    });
  };

  const handleTouchStart = (
    e: React.TouchEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => {
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setConfirmDeleteNodeId(null);
      setContextMenu({
        x: touchX,
        y: touchY,
        nodeId,
        nodeName,
        nodePath,
        isDirectory,
        fileItem,
      });
    }, 550);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleRenameSubmit = (nodeId: string, newName: string) => {
    if (onRenameNode && newName.trim()) {
      onRenameNode(nodeId, newName.trim());
    }
    setEditingNodeId(null);
  };

  return (
    /* Outer Layout Slot (Adjusts width without squishing inner panel) */
    <div
      className={`relative h-full shrink-0 transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-0' : 'w-72 sm:w-80'
      }`}
    >
      {/* Solid Inner Panel with Rigid Width & Smooth Translation (整体平移) */}
      <aside
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`glass-panel rounded-glass-lg flex flex-col select-none h-full w-72 sm:w-80 absolute top-0 left-0 transition-transform duration-300 ease-in-out overflow-visible ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Chrome Tab Style Collapse Handle (Attached to the right border) */}
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-6 top-1/2 -translate-y-1/2 z-40 cursor-pointer group flex items-center justify-center select-none"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {/* Chrome Tab Body */}
          <div className="relative w-6 h-18 bg-white/95 dark:bg-[#18181b]/95 hover:bg-white dark:hover:bg-[#222226] border border-l-0 border-black/15 dark:border-white/15 rounded-r-2xl shadow-xl flex flex-col items-center justify-center gap-1.5 backdrop-blur-xl transition-all duration-200 group-hover:w-7 group-hover:shadow-blue-500/15">
            {/* Top Grip Accent */}
            <div className="w-1 h-2 rounded-full bg-black/25 dark:bg-white/30 group-hover:bg-blue-500 transition-colors" />

            {/* Direction Indicator */}
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-5 text-zinc-600 dark:text-zinc-300 transition-transform" />
            ) : (
              <ChevronLeft className="w-3.5 h-5 text-zinc-600 dark:text-zinc-300 transition-transform" />
            )}

            {/* Bottom Grip Accent */}
            <div className="w-1 h-2 rounded-full bg-black/25 dark:bg-white/30 group-hover:bg-blue-500 transition-colors" />
          </div>
        </div>

        {/* Hidden File Input for Native Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />

        {/* Header Profile / Vault Title */}
        <VaultHeader
          activeVault={activeVault}
          onOpenVaultSettings={onOpenVaultSettings}
          onLockVault={onLockVault}
          onLogoutAccount={onLogoutAccount}
        />

        {/* Action Utility Bar: New Note, New Folder, Upload Media */}
        <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 shrink-0">
          <button
            onClick={onCreateNote}
            disabled={isCreatingNote}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingNote ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>{t('newNote')}</span>
          </button>

          <button
            onClick={() => setIsFolderInputOpen(true)}
            disabled={isCreatingFolderLoading}
            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition border border-black/10 dark:border-white/10 cursor-pointer disabled:opacity-50"
            title={t('createDirectory')}
          >
            {isCreatingFolderLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <FolderPlus className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFiles}
            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition border border-black/10 dark:border-white/10 cursor-pointer disabled:opacity-50"
            title={isUploadingFiles ? t('uploading') : t('addFileMedia')}
          >
            {isUploadingFiles ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Inline Folder Creation Form */}
        {isFolderInputOpen && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="p-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 shrink-0"
          >
            <input
              ref={folderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('createDirectory')}
              autoFocus
              className="flex-1 px-2.5 py-1 bg-white dark:bg-black/40 border border-black/15 dark:border-white/10 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFolderInputOpen(false)}
              className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Live Search Bar */}
        <div className="p-3 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 font-mono"
            />
          </div>
        </div>

        {/* File Tree Explorer (Hierarchical) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {isLoadingVaultTree ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
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

        {/* Context Menu Popover for Right-Click / Touch Long-Press */}
        {contextMenu && (
          <div
            className="fixed inset-0 z-50 select-none"
            onClick={() => {
              setContextMenu(null);
              setConfirmDeleteNodeId(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          >
            <div
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
              className="fixed w-48 backdrop-blur-xl bg-white/95 dark:bg-[#09090B]/95 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 border-b border-black/5 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold truncate flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{contextMenu.nodeName}</span>
              </div>

              {/* Download Button */}
              <button
                onClick={() => {
                  const targetId = contextMenu.nodeId;
                  setContextMenu(null);
                  if (onDownloadNode) {
                    onDownloadNode(targetId);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition my-0.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t('download')}</span>
              </button>

              {/* Rename Button */}
              {onRenameNode && (
                <button
                  onClick={() => {
                    const targetId = contextMenu.nodeId;
                    const targetName = contextMenu.fileItem?.filename || contextMenu.nodeName;
                    setContextMenu(null);
                    setConfirmDeleteNodeId(null);
                    setEditingNodeId(targetId);
                    setEditingName(targetName);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition my-0.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t('rename')}</span>
                </button>
              )}

              {confirmDeleteNodeId === contextMenu.nodeId ? (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1.5 my-1 animate-in fade-in duration-100">
                  <p className="text-[11px] text-red-600 dark:text-red-300 font-medium">{t('confirmDelete')}</p>
                  <div className="flex items-center gap-1.5 justify-end pt-0.5">
                    <button
                      onClick={() => {
                        const targetId = contextMenu.nodeId;
                        setContextMenu(null);
                        setConfirmDeleteNodeId(null);
                        if (onDeleteNode) {
                          onDeleteNode(targetId);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold transition shadow-sm cursor-pointer"
                    >
                      {t('confirm')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteNodeId(null)}
                      className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-[10px] transition cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteNodeId(contextMenu.nodeId)}
                  disabled={isDeletingNodeId === contextMenu.nodeId}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/15 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDeletingNodeId === contextMenu.nodeId ? (
                    <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>{isDeletingNodeId === contextMenu.nodeId ? t('deleting') : t('delete')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
