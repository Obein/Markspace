import React, { useState, useRef } from 'react';
import { VaultFileItem } from '../../../interfaces/INoteModels';
import { ContextMenuState } from '../SidebarDrawer.types';

export interface UseSidebarFileTreeInteractionsProps {
  onCreateFolder: (name: string) => void;
  onMoveFileToDirectory: (fileId: string, targetFolderPath: string) => void;
  onRenameNode?: (nodeId: string, newName: string) => void;
}

export function useSidebarFileTreeInteractions({
  onCreateFolder,
  onMoveFileToDirectory,
  onRenameNode,
}: UseSidebarFileTreeInteractionsProps) {
  // Inline folder creation form
  const [isFolderInputOpen, setIsFolderInputOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // File tree interaction
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  // Inline rename
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null);

  // Long-press detection timer for touch devices
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Folder expand / collapse
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === false ? true : false,
    }));
  };

  // Node drag-and-drop
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

  // Context menu (right-click)
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

  // Context menu (long-press / touch)
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

  // Inline rename
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

  // Create folder
  const handleCreateFolder = (name: string) => {
    onCreateFolder(name);
    setNewFolderName('');
  };

  return {
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
  };
}
