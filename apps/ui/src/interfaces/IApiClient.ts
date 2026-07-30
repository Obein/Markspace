import { NoteItem, NoteMetadataItem } from './INoteModels';

export type UserRole = 'admin' | 'user';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export interface IApiClient {
  setToken(token: string): void;
  register(username: string, authToken: string): Promise<AuthResponse>;
  login(username: string, authToken: string): Promise<AuthResponse>;
  getNotesList(): Promise<NoteMetadataItem[]>;
  getNoteById(id: string): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>;
  createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem>;
  updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem>;
  deleteNote(id: string): Promise<void>;
}
