export type FileCategory = 'markdown' | 'image' | 'audio' | 'video' | 'binary';

export interface VaultInfo {
  id: string;
  name: string;
  createdAt: number;
}

export interface VaultFileItem {
  id: string;
  name: string;
  filename: string;
  path: string; // e.g. "notes.md" or "assets/image.png"
  category: FileCategory;
  mimeType: string;
  size: number;
  content: string; // Plaintext content for md/text, or base64/dataURL for binary
  encryptedTitle: string;
  encryptedPayload: string;
  encryptedDek: string;
  vaultId: string;
  createdAt: number;
  updatedAt: number;
  blobUrl?: string;
}

export interface NoteItem extends VaultFileItem {
  title: string;
}

export interface NoteMetadataItem {
  id: string;
  encryptedTitle: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  fileItem?: VaultFileItem;
  children?: FileTreeNode[];
}
