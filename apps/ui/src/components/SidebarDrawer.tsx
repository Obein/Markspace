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
  Loader2,
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
  onLogoutAccount: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeVault: VaultInfo | null;
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
  onLogoutAccount,
  searchQuery,
  onSearchChange,
  activeVault,
  onDeleteNode,
  onDownloadNode,
  isLoadingVaultTree = false,
  isCreatingNote = false,
  isCreatingFolderLoading = false,
  isDeletingNodeId = null,
  isUploadingFiles = false,
}) => {
  const { t } = useI18n();

  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  // Floating Context Menu State for Right-Click & Touch Long-Press
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on Esc key or window resize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const handleResize = () => setContextMenu(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  // Filter files by search query
  const filteredFiles = searchQuery.trim()
    ? files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const fileTree = FileTreeBuilder.buildTree(filteredFiles);

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'markdown':
        return <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-blue-300 shrink-0" />;
      case 'video':
        return <Film className="w-3.5 h-3.5 text-blue-300 shrink-0" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-blue-300 shrink-0" />;
      default:
        return <File className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  const handleNodeDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleFolderDragOverNode = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPath(folderPath);
  };

  const handleFolderDropNode = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPath(null);
    const sourceId = e.dataTransfer.getData('text/plain') || draggedNodeId;
    if (sourceId) {
      onMoveFileToDirectory(sourceId, folderPath);
      setDraggedNodeId(null);
    }
  };

  // Right-Click Context Menu Trigger
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

    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 160);

    setContextMenu({
      x,
      y,
      nodeId,
      nodeName,
      nodePath,
      isDirectory,
      fileItem,
    });
  };

  // Touch Screen Long-Press Context Menu Trigger (500ms)
  const handleTouchStart = (
    e: React.TouchEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchTimerRef.current = setTimeout(() => {
      const x = Math.min(clientX, window.innerWidth - 200);
      const y = Math.min(clientY, window.innerHeight - 160);

      setContextMenu({
        x,
        y,
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
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-80 h-full glass-panel rounded-glass-lg border flex flex-col overflow-hidden shrink-0 shadow-2xl relative z-10 transition-all duration-300 ${
        isDragOver ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20' : 'border-white/10'
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />

      {/* Vault Header & Action Buttons */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono truncate max-w-[140px]">
                {activeVault ? activeVault.name : t('mainVault')}
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('encryptedVault')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onLockVault}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition border border-white/10"
              title={t('lockVault')}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogoutAccount}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition border border-red-500/20"
              title={t('logoutAccount')}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar: New Note (Text) & New Dir (Icon-Only No Text) */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onCreateNote}
            disabled={isCreatingNote}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-medium font-mono flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
          >
            {isCreatingNote ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>{t('newNote')}</span>
          </button>

          <button
            onClick={() => setIsCreatingFolder(true)}
            disabled={isCreatingFolderLoading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-zinc-300 hover:text-white transition border border-white/10 flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
            title={t('createDirectory')}
          >
            {isCreatingFolderLoading ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : (
              <FolderPlus className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>

        {/* Inline Create Folder Input Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolderSubmit} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="folder_name"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-blue-500/50 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={isCreatingFolderLoading}
              className="p-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition disabled:bg-blue-600/50 disabled:cursor-not-allowed flex items-center justify-center"
              title={t('confirm')}
            >
              {isCreatingFolderLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="p-1.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition"
              title={t('cancel')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Search Bar Input */}
        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition"
          />
        </div>
      </div>

      {/* File Tree Items Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoadingVaultTree ? (
          <div className="p-12 text-center text-zinc-400 text-xs font-mono space-y-3 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin opacity-80" />
            <p className="text-zinc-400 font-medium">{t('loadingVaultTree')}</p>
          </div>
        ) : fileTree.length > 0 ? (
          renderTreeNodes(fileTree)
        ) : (
          <div className="p-8 text-center text-zinc-600 text-xs font-mono space-y-2">
            <FileText className="w-8 h-8 opacity-20 mx-auto" />
            <p>{t('noFilesFound')}</p>
          </div>
        )}
      </div>

      {/* Panel Footer: Add File Button */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingFiles}
          className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium font-mono flex items-center justify-center gap-2 transition border border-white/10 disabled:cursor-not-allowed"
        >
          {isUploadingFiles ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span>{isUploadingFiles ? t('uploading') : t('addFileMedia')}</span>
        </button>
      </div>

      {/* Right-Click & Touch Long-Press Floating Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 pointer-events-auto"
          onClick={() => setContextMenu(null)}
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

            <button
              onClick={() => {
                const targetId = contextMenu.nodeId;
                setContextMenu(null);
                if (onDeleteNode) {
                  onDeleteNode(targetId);
                }
              }}
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
          </div>
        </div>
      )}
    </aside>
  );
};
