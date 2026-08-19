import { NoteItem, NoteMetadataItem } from '../../interfaces/INoteModels';
import { HttpTransport } from './HttpTransport';

export class NotesApi {
  constructor(private readonly transport: HttpTransport) {}

  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.transport.request<NoteMetadataItem[]>('/notes', {
      method: 'GET',
    });
  }

  async getNoteById(
    id: string
  ): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }> {
    return this.transport.request<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>(
      `/notes/${id}`,
      { method: 'GET' }
    );
  }

  async createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem> {
    return this.transport.request<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem> {
    return this.transport.request<NoteItem>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.transport.request<void>(`/notes/${id}`, {
      method: 'DELETE',
    });
  }
}
