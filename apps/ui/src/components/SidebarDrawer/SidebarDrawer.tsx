import React, { useRef, useState, useEffect, useCallback } from 'react';
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
 * Responsive behaviour:
 * - md+ (≥768 px): push-layout. Sidebar occupies a flex-shrink-0 slot (w-72/w-80 expanded, w-3.5 collapsed).
 * - <md (mobile):
 *   • Collapsed: outer layout slot takes w-3.5 so the editor is pushed right and never overlapped by the exposed edge.
 *     Sidebar has no handle, only exposes the 14px frosted glass edge.
 *   • Expanded: sliding fixed overlay with backdrop-blur and semi-transparent backdrop.
 *   • Touch gestures: edge-swipe-right (<60px from screen edge) to open, swipe-left anywhere to collapse.
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

  // ── Mobile detection ─────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Sidebar collapse ─────────────────────────────────────────────────────────
  // Default collapsed on mobile if a file is already active, otherwise open; expanded on desktop.
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return Boolean(activeFileId);
    }
    return false;
  });

  // Auto-expand sidebar on mobile if entering the main interface with no active file
  const prevVaultTreeLoadingRef = useRef(isLoadingVaultTree);
  useEffect(() => {
    if (!isMobile) return;

    // When vault tree finishes loading and there is no active file, auto-open sidebar on mobile
    if (prevVaultTreeLoadingRef.current && !isLoadingVaultTree) {
      if (!activeFileId) {
        setIsCollapsed(false);
      }
    }
    prevVaultTreeLoadingRef.current = isLoadingVaultTree;
  }, [isMobile, isLoadingVaultTree, activeFileId]);

  // ── Inline folder creation form ──────────────────────────────────────────────
  const [isFolderInputOpen, setIsFolderInputOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // ── File tree interaction ────────────────────────────────────────────────────
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  // ── Inline rename ────────────────────────────────────────────────────────────
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // ── Context menu ─────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null);

  // Long-press detection timer for touch devices
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Touch swipe gestures for mobile (swipe right from edge to open, swipe left to close) ──
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;
      if (e.changedTouches.length !== 1) return;

      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (isCollapsed) {
          // Swiping right starting within 60px of the screen left edge -> Open drawer
          if (touchStartXRef.current < 60 && deltaX > 40) {
            setIsCollapsed(false);
          }
        } else {
          // Swiping left anywhere when expanded -> Close drawer
          if (deltaX < -40) {
            setIsCollapsed(true);
          }
        }
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isCollapsed]);

  const treeNodes = FileTreeBuilder.buildTree(files);

  // ── Folder expand / collapse ─────────────────────────────────────────────────
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === false ? true : false,
    }));
  };

  // ── Drag-and-drop (sidebar-level drop zone) ──────────────────────────────────
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

  // ── Tree node drag-and-drop ──────────────────────────────────────────────────
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

  // ── Context menu (right-click) ───────────────────────────────────────────────
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

  // ── Context menu (long-press / touch) ────────────────────────────────────────
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

  // ── Inline rename ────────────────────────────────────────────────────────────
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

  // ── Create folder ────────────────────────────────────────────────────────────
  const handleCreateFolder = (name: string) => {
    onCreateFolder(name);
    setNewFolderName('');
  };

  // ── Mobile: collapse sidebar after selecting a file ──────────────────────────
  const handleMobileSelectFile = useCallback(
    (fileId: string) => {
      onSelectFile(fileId);
      if (isMobile) setIsCollapsed(true);
    },
    [onSelectFile, isMobile]
  );

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
      {/* ════════════════════════════════════════════════════════════════════
          MOBILE OVERLAY LAYER
          Rendered as direct Fragment children so they participate in the
          root stacking context. Fixed overlay with backdrop blur.
          On mobile, no handle is shown; only the exposed side sliver is visible.
          ════════════════════════════════════════════════════════════════════ */}

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

      {/* ════════════════════════════════════════════════════════════════════
          LAYOUT SLOT (Mobile & Desktop)
          - When collapsed (mobile & desktop): occupies w-3.5 to push the editor
            rightwards, ensuring the editor never overlaps with the collapsed peek.
          - When expanded on mobile: remains w-3.5 so editor does not resize.
          - When expanded on desktop: expands to w-72/w-80.
          ════════════════════════════════════════════════════════════════════ */}
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
          {/* Desktop Chrome Tab-style Collapse Handle */}
          {collapseHandle}
          {panelContent}
        </aside>
      </div>
    </>
  );
};
