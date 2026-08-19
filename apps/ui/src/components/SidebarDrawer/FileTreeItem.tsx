import React, { useRef, useEffect } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Film,
  Music,
  File,
  Check,
  Loader2,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { FileTreeNode, VaultFileItem } from '../../interfaces/INoteModels';

interface FileTreeItemProps {
  nodes: FileTreeNode[];
  depth?: number;
  activeFileId: string | null;
  expandedFolders: Record<string, boolean>;
  dragOverFolderPath: string | null;
  editingNodeId: string | null;
  editingName: string;
  isDeletingNodeId?: string | null;
  onSelectFile: (id: string) => void;
  onToggleFolder: (path: string) => void;
  onRenameSubmit: (nodeId: string, newName: string) => void;
  onCancelRename: () => void;
  onEditingNameChange: (name: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => void;
  onTouchStart: (
    e: React.TouchEvent,
    nodeId: string,
    nodeName: string,
    nodePath: string,
    isDirectory: boolean,
    fileItem?: VaultFileItem
  ) => void;
  onTouchEndOrMove: () => void;
  onNodeDragStart: (e: React.DragEvent, fileId: string) => void;
  onFolderDragOverNode: (e: React.DragEvent, folderPath: string) => void;
  onFolderDragLeaveNode: () => void;
  onFolderDropNode: (e: React.DragEvent, targetFolderPath: string) => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  nodes,
  depth = 0,
  activeFileId,
  expandedFolders,
  dragOverFolderPath,
  editingNodeId,
  editingName,
  isDeletingNodeId,
  onSelectFile,
  onToggleFolder,
  onRenameSubmit,
  onCancelRename,
  onEditingNameChange,
  onContextMenu,
  onTouchStart,
  onTouchEndOrMove,
  onNodeDragStart,
  onFolderDragOverNode,
  onFolderDragLeaveNode,
  onFolderDropNode,
}) => {
  const { t } = useI18n();
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'video':
        return <Film className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" />;
      case 'binary':
        return <File className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  return (
    <>
      {nodes.map((node) => {
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
                  if (editingName.trim()) {
                    onRenameSubmit(node.id, editingName.trim());
                  }
                  onCancelRename();
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/40 text-xs font-mono my-0.5"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => onEditingNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onCancelRename();
                  }}
                  onBlur={() => {
                    if (editingName.trim() && editingName.trim() !== node.name) {
                      onRenameSubmit(node.id, editingName.trim());
                    }
                    onCancelRename();
                  }}
                  className="flex-1 bg-transparent text-zinc-900 dark:text-white font-mono text-xs focus:outline-none min-w-0"
                />
                <button
                  type="submit"
                  className="p-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-white shrink-0 cursor-pointer"
                  title={t('confirm')}
                >
                  <Check className="w-3 h-3" />
                </button>
              </form>
            );
          }

          return (
            <div
              key={node.id}
              className="select-none"
              onDragOver={(e) => onFolderDragOverNode(e, node.path)}
              onDragLeave={onFolderDragLeaveNode}
              onDrop={(e) => onFolderDropNode(e, node.path)}
            >
              <button
                onClick={() => onToggleFolder(node.path)}
                onContextMenu={(e) => onContextMenu(e, node.id, node.name, node.path, true)}
                onTouchStart={(e) => onTouchStart(e, node.id, node.name, node.path, true)}
                onTouchEnd={onTouchEndOrMove}
                onTouchMove={onTouchEndOrMove}
                disabled={isDeleting}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono transition border cursor-pointer ${
                  isTarget
                    ? 'bg-[var(--accent-primary)]/15 dark:bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/40 text-[var(--accent-primary-dark)] dark:text-[var(--accent-primary-light)]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
                ) : isOpen ? (
                  <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                )}
                {isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </button>

              {isOpen && node.children && (
                <div className="space-y-0.5">
                  <FileTreeItem
                    nodes={node.children}
                    depth={depth + 1}
                    activeFileId={activeFileId}
                    expandedFolders={expandedFolders}
                    dragOverFolderPath={dragOverFolderPath}
                    editingNodeId={editingNodeId}
                    editingName={editingName}
                    isDeletingNodeId={isDeletingNodeId}
                    onSelectFile={onSelectFile}
                    onToggleFolder={onToggleFolder}
                    onRenameSubmit={onRenameSubmit}
                    onCancelRename={onCancelRename}
                    onEditingNameChange={onEditingNameChange}
                    onContextMenu={onContextMenu}
                    onTouchStart={onTouchStart}
                    onTouchEndOrMove={onTouchEndOrMove}
                    onNodeDragStart={onNodeDragStart}
                    onFolderDragOverNode={onFolderDragOverNode}
                    onFolderDragLeaveNode={onFolderDragLeaveNode}
                    onFolderDropNode={onFolderDropNode}
                  />
                </div>
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
                if (editingName.trim()) {
                  onRenameSubmit(node.id, editingName.trim());
                }
                onCancelRename();
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/40 text-xs font-mono my-0.5"
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              {getFileIcon(fileItem.category)}
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelRename();
                }}
                onBlur={() => {
                  if (editingName.trim() && editingName.trim() !== fileItem.filename) {
                    onRenameSubmit(node.id, editingName.trim());
                  }
                  onCancelRename();
                }}
                className="flex-1 bg-transparent text-zinc-900 dark:text-white font-mono text-xs focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="p-0.5 text-[var(--accent-primary)] hover:text-blue-800 dark:hover:text-white shrink-0 cursor-pointer"
                title={t('confirm')}
              >
                <Check className="w-3 h-3" />
              </button>
            </form>
          );
        }

        return (
          <button
            key={node.id}
            draggable={!isDeleting}
            onDragStart={(e) => onNodeDragStart(e, fileItem.id)}
            onClick={() => onSelectFile(fileItem.id)}
            onContextMenu={(e) =>
              onContextMenu(e, fileItem.id, fileItem.filename, fileItem.path, false, fileItem)
            }
            onTouchStart={(e) =>
              onTouchStart(e, fileItem.id, fileItem.filename, fileItem.path, false, fileItem)
            }
            onTouchEnd={onTouchEndOrMove}
            onTouchMove={onTouchEndOrMove}
            disabled={isDeleting}
            className={`w-full text-left px-2 py-1.5 rounded-lg transition flex items-center justify-between text-xs font-mono border cursor-grab active:cursor-grabbing ${
              isActive
                ? 'bg-[var(--accent-primary)]/15 dark:bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/40 text-[var(--accent-primary-dark)] dark:text-white font-medium'
                : 'bg-white/0 hover:bg-black/5 dark:hover:bg-white/5 border-transparent text-zinc-700 dark:text-zinc-300'
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
          </button>
        );
      })}
    </>
  );
};
