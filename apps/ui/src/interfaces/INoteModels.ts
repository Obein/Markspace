export interface NoteItem {
  id: string;
  title: string;
  content: string;
  encryptedTitle: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteMetadataItem {
  id: string;
  encryptedTitle: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface MediaItem {
  id: string;
  fileName: string;
  mimeType: string;
  encryptedDek: string;
  size: number;
  blobUrl?: string;
}
