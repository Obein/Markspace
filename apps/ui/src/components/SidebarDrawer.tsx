import React, { useRef, useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Lock,
  LogOut,
  ShieldAlert,
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
} from 'lucide-react';
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    assets: true,
    documents: true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderInput(false);
    }
  };

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileTree = FileTreeBuilder.buildTree(filteredFiles);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const renderTreeNodes = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.isDirectory) {
        const isOpen = expandedFolders[node.path] !== false;
        const isTarget = dragOverFolderPath === node.path;

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
              className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-300 font-mono transition border ${
                isTarget ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'hover:bg-white/5 border-transparent'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
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

      return (
        <button
          key={node.id}
          draggable
          onDragStart={(e) => handleNodeDragStart(e, fileItem.id)}
          onClick={() => onSelectFile(fileItem.id)}
          className={`w-full text-left px-2 py-1.5 rounded-lg transition flex items-center justify-between text-xs font-mono border cursor-grab active:cursor-grabbing ${
            isActive
              ? 'bg-blue-600/20 border-blue-500/40 text-white font-medium'
              : 'bg-white/0 hover:bg-white/5 border-transparent text-zinc-300'
          }`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {getFileIcon(fileItem.category)}
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

      {/* Drag & Drop Banner Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-2 animate-in fade-in">
          <Upload className="w-12 h-12 animate-bounce" />
          <h3 className="text-lg font-bold">Drop files to add to Vault</h3>
          <p className="text-xs text-blue-200">Supports Markdown, Media & Binary files</p>
        </div>
      )}

      {/* Top Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
            M
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-white">Markspace</h1>
            <div className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
              <Database className="w-3 h-3" />
              <span>{activeVault?.name || 'Vault'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onLockVault}
            title="Lock Data Vault (Wipe CMK Memory)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-blue-300 transition border border-white/5"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onLogoutAccount}
            title="Logout Account"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-blue-300 transition border border-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons Toolbar (Unified Primary Accent Tints) */}
      <div className="p-3 space-y-2 border-b border-white/5">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onCreateNote}
            className="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition border border-blue-400/20 shadow-md shadow-blue-500/10"
            title="Create new Markdown note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-medium flex items-center justify-center gap-1 transition border border-blue-500/30"
            title="Add local file or media"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Add File</span>
          </button>

          <button
            onClick={() => setShowFolderInput(!showFolderInput)}
            className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1 transition border border-white/10"
            title="Add Directory folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Dir</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Vault files..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition font-mono"
          />
        </div>
      </div>

      {/* Inline Add Directory Form */}
      {showFolderInput && (
        <div className="px-3 pt-2">
          <form onSubmit={handleCreateFolderSubmit} className="flex gap-1.5 p-2 bg-white/5 rounded-xl border border-blue-500/40 animate-in fade-in">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name (e.g. documents)..."
              className="flex-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowFolderInput(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* File System Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 opacity-20" />
            <span>Vault is empty</span>
            <span className="text-[10px] text-zinc-600">Drag files here or click Add File / Add Dir</span>
          </div>
        ) : (
          renderTreeNodes(fileTree)
        )}
      </div>

      {/* Bottom Footer */}
      <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
          <Folder className="w-3.5 h-3.5 text-blue-400" />
          <span>{files.length} {files.length === 1 ? 'file' : 'files'}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
          <ShieldAlert className="w-3 h-3 text-blue-400" />
          <span>E2EE Vault</span>
        </div>
      </div>
    </aside>
  );
};
