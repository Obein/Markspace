import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Lock,
  LogOut,
  Database,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  Film,
  Music,
  File,
  FolderPlus,
  X,
  Check,
  Download,
  Trash2,
  Edit2,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { FileTreeNode, VaultFileItem, VaultInfo } from '../interfaces/INoteModels';
import { FileTreeBuilder } from '../utils/FileTreeBuilder';

interface SidebarDrawerProps {
  files: VaultFileItem[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateNote: () => void;
  onCreateFolder: (folderName: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onMoveFileToDirectory: (fileId: string, targetFolderPath: string) => void;
  onLockVault: () => void;
  onOpenVaultSettings?: () => void;
  onLogoutAccount: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeVault: VaultInfo | null;
  onRenameNode?: (nodeId: string, newFilename: string) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => void;
  onDownloadNode?: (nodeId: string) => void;

  // Operation Buffering / Loading States
  isLoadingVaultTree?: boolean;
  isCreatingNote?: boolean;
  isCreatingFolderLoading?: boolean;
  isDeletingNodeId?: string | null;
  isUploadingFiles?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeName: string;
  nodePath: string;
  isDirectory: boolean;
  fileItem?: VaultFileItem;
}

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

  // Inline node renaming state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus and select base filename only (excluding extension) on entering edit mode
  useEffect(() => {
    if (editingNodeId && editInputRef.current) {
      const input = editInputRef.current;
      input.focus();
      const lastDot = input.value.lastIndexOf('.');
      if (lastDot > 0) {
        input.setSelectionRange(0, lastDot);
      } else {
        input.select();
      }
    }
  }, [editingNodeId]);

  // Build hierarchical tree
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

  // Drag and drop node into directory
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

  // Category Icon helper
  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'video':
        return <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'binary':
        return <File className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  // Context Menu handler for right-click
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

  // Touch long press handler for mobile/tablet devices
  const handleTouchStart = (
    e: React.TouchEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchTimerRef.current = setTimeout(() => {
      setConfirmDeleteNodeId(null);
      setContextMenu({
        x: clientX,
        y: clientY,
        nodeId,
        nodeName,
        nodePath,
        isDirectory,
        fileItem,
      });
    }, 500);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const renderTreeNodes = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.isDirectory) {
        const isOpen = expandedFolders[node.path] !== false;
        const isTarget = dragOverFolderPath === node.path;
        const isDeleting = isDeletingNodeId === node.id;

        if (editingNodeId === node.id) {
          return (
            <form
              key={node.id}
              onSubmit={(e) => {
                e.preventDefault();
                if (editingName.trim() && onRenameNode) {
                  onRenameNode(node.id, editingName.trim());
                }
                setEditingNodeId(null);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/40 text-xs font-mono my-0.5"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingNodeId(null);
                  }
                }}
                onBlur={() => {
                  if (editingName.trim() && editingName.trim() !== node.name && onRenameNode) {
                    onRenameNode(node.id, editingName.trim());
                  }
                  setEditingNodeId(null);
                }}
                className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none min-w-0"
              />
              <button type="submit" className="p-0.5 text-blue-400 hover:text-white shrink-0" title={t('confirm')}>
                <Check className="w-3 h-3" />
              </button>
            </form>
          );
        }

        return (
          <div
            key={node.id}
            className="select-none"
            onDragOver={(e) => handleFolderDragOverNode(e, node.path)}
            onDragLeave={() => setDragOverFolderPath(null)}
            onDrop={(e) => handleFolderDropNode(e, node.path)}
          >
            <button
              onClick={() => toggleFolder(node.path)}
              onContextMenu={(e) => handleContextMenu(e, node.id, node.name, node.path, true)}
              onTouchStart={(e) => handleTouchStart(e, node.id, node.name, node.path, true)}
              onTouchEnd={handleTouchEndOrMove}
              onTouchMove={handleTouchEndOrMove}
              disabled={isDeleting}
              className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-300 font-mono transition border ${
                isTarget ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'hover:bg-white/5 border-transparent'
              } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
              ) : isOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
              {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              <span className="truncate">{node.name}</span>
            </button>

            {isOpen && node.children && (
              <div className="space-y-0.5">{renderTreeNodes(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      const fileItem = node.fileItem!;
      const isActive = fileItem.id === activeFileId;
      const isDeleting = isDeletingNodeId === fileItem.id;

      if (editingNodeId === node.id) {
        return (
          <form
            key={node.id}
            onSubmit={(e) => {
              e.preventDefault();
              if (editingName.trim() && onRenameNode) {
                onRenameNode(node.id, editingName.trim());
              }
              setEditingNodeId(null);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/40 text-xs font-mono my-0.5"
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            {getFileIcon(fileItem.category)}
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingNodeId(null);
                }
              }}
              onBlur={() => {
                if (editingName.trim() && editingName.trim() !== fileItem.filename && onRenameNode) {
                  onRenameNode(node.id, editingName.trim());
                }
                setEditingNodeId(null);
              }}
              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none min-w-0"
            />
            <button type="submit" className="p-0.5 text-blue-400 hover:text-white shrink-0" title={t('confirm')}>
              <Check className="w-3 h-3" />
            </button>
          </form>
        );
      }

      return (
        <button
          key={node.id}
          draggable={!isDeleting}
          onDragStart={(e) => handleNodeDragStart(e, fileItem.id)}
          onClick={() => onSelectFile(fileItem.id)}
          onContextMenu={(e) => handleContextMenu(e, fileItem.id, fileItem.filename, fileItem.path, false, fileItem)}
          onTouchStart={(e) => handleTouchStart(e, fileItem.id, fileItem.filename, fileItem.path, false, fileItem)}
          onTouchEnd={handleTouchEndOrMove}
          onTouchMove={handleTouchEndOrMove}
          disabled={isDeleting}
          className={`w-full text-left px-2 py-1.5 rounded-lg transition flex items-center justify-between text-xs font-mono border cursor-grab active:cursor-grabbing ${
            isActive
              ? 'bg-blue-600/20 border-blue-500/40 text-white font-medium'
              : 'bg-white/0 hover:bg-white/5 border-transparent text-zinc-300'
          } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin shrink-0" />
            ) : (
              getFileIcon(fileItem.category)
            )}
            <span className="truncate">{fileItem.filename}</span>
          </div>
          <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
            {(fileItem.size / 1024).toFixed(0)}K
          </span>
        </button>
      );
    });
  };

  return (
    <aside
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        transform: isCollapsed ? 'translateX(calc(-100% + 14px))' : 'translateX(0)',
        marginRight: isCollapsed ? 'calc(-20rem + 14px)' : '0px',
      }}
      className="relative w-80 h-full shrink-0 flex flex-col glass-panel rounded-glass-lg border border-white/10 overflow-visible transition-all duration-300 ease-out z-30 shadow-2xl"
    >
      {/* Physical Edge Drawer Pull Handle: 100% Flush to right edge */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 left-full z-50 flex items-center justify-center w-5 h-16 bg-[#09090B]/90 backdrop-blur-xl border border-white/20 border-l-0 rounded-r-xl cursor-pointer opacity-40 hover:opacity-100 active:opacity-100 transition-all duration-200 shadow-2xl group select-none"
        title={isCollapsed ? 'Expand Sidebar Drawer' : 'Collapse Sidebar Drawer'}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="w-1 h-3 rounded-full bg-white/40 group-hover:bg-blue-400 transition" />
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition" />
          )}
          <div className="w-1 h-3 rounded-full bg-white/40 group-hover:bg-blue-400 transition" />
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
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              <span>Markspace</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                E2EE
              </span>
            </h1>
            <p className="text-xs text-zinc-400 truncate max-w-[140px] font-mono">
              {activeVault ? activeVault.name : t('encryptedVault')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenVaultSettings && (
            <button
              onClick={onOpenVaultSettings}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              title={t('vaultSettings')}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLockVault}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            title={t('lockVault')}
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={onLogoutAccount}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            title={t('logoutAccount')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Utility Bar: New Note, New Folder, Upload Media */}
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
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
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition border border-white/10 cursor-pointer disabled:opacity-50"
          title={t('createDirectory')}
        >
          {isCreatingFolderLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <FolderPlus className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingFiles}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition border border-white/10 cursor-pointer disabled:opacity-50"
          title={isUploadingFiles ? t('uploading') : t('addFileMedia')}
        >
          {isUploadingFiles ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Inline Folder Creation Form */}
      {isFolderInputOpen && (
        <form onSubmit={handleCreateFolderSubmit} className="p-3 border-b border-white/10 flex items-center gap-2">
          <input
            ref={folderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('createDirectory')}
            autoFocus
            className="flex-1 px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="p-1 text-blue-400 hover:text-blue-300 cursor-pointer">
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFolderInputOpen(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Live Search Bar */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/20 border border-white/5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 font-mono"
          />
        </div>
      </div>

      {/* File Tree Explorer (Hierarchical) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoadingVaultTree ? (
          <div className="p-8 text-center text-zinc-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span>{t('loadingVaultTree')}</span>
          </div>
        ) : treeNodes.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            {t('noFilesFound')}
          </div>
        ) : (
          renderTreeNodes(treeNodes)
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
            className="fixed w-48 backdrop-blur-xl bg-[#09090B]/95 border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-white/10 text-[11px] text-zinc-400 font-semibold truncate flex items-center gap-1.5">
              {contextMenu.isDirectory ? (
                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : (
                getFileIcon(contextMenu.fileItem?.category || 'markdown')
              )}
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
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-200 hover:text-white flex items-center gap-2 transition my-0.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('download')}</span>
            </button>

            {/* Rename Button */}
            {onRenameNode && (
              <button
                onClick={() => {
                  const targetId = contextMenu.nodeId;
                  const targetName = contextMenu.nodeName;
                  setContextMenu(null);
                  setConfirmDeleteNodeId(null);
                  setEditingNodeId(targetId);
                  setEditingName(targetName);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-200 hover:text-white flex items-center gap-2 transition my-0.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('rename')}</span>
              </button>
            )}

            {confirmDeleteNodeId === contextMenu.nodeId ? (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1.5 my-1 animate-in fade-in duration-100">
                <p className="text-[11px] text-red-300 font-medium">{t('confirmDelete')}</p>
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
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold transition shadow-sm"
                  >
                    {t('confirm')}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteNodeId(null)}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-zinc-300 text-[10px] transition"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteNodeId(contextMenu.nodeId)}
                disabled={isDeletingNodeId === contextMenu.nodeId}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingNodeId === contextMenu.nodeId ? (
                  <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>{isDeletingNodeId === contextMenu.nodeId ? t('deleting') : t('delete')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
