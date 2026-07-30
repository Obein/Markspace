export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  authTokenHash: string;
  salt: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  userId: string;
  encryptedTitle: string;
  encryptedPayload: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteMetadata {
  id: string;
  encryptedTitle: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: string;
  userId: string;
  noteId: string | null;
  fileName: string;
  mimeType: string;
  encryptedDek: string;
  r2Key: string;
  size: number;
  createdAt: number;
}

export interface RegisterDTO {
  username: string;
  authToken: string;
}

export interface LoginDTO {
  username: string;
  authToken: string;
}

export interface CreateNoteDTO {
  encryptedTitle: string;
  encryptedPayload: string;
  encryptedDek: string;
}

export interface UpdateNoteDTO {
  encryptedTitle?: string;
  encryptedPayload?: string;
  encryptedDek?: string;
}

export interface UploadMediaDTO {
  fileName: string;
  mimeType: string;
  encryptedDek: string;
  size: number;
  noteId?: string;
}

export interface UpdateUserRoleDTO {
  role: UserRole;
}
