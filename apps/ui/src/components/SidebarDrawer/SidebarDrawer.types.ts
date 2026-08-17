import { VaultFileItem, VaultInfo } from '../../interfaces/INoteModels';

export interface SidebarDrawerProps {
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

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeName: string;
  nodePath: string;
  isDirectory: boolean;
  fileItem?: VaultFileItem;
}
