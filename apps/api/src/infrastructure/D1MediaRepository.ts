import { IMediaRepository } from '../interfaces/IMediaRepository';
import { Media } from '../types/domain';

export class D1MediaRepository implements IMediaRepository {
  constructor(private readonly db: D1Database) {}

  async findByIdAndUserId(id: string, userId: string): Promise<Media | null> {
    const result = await this.db
      .prepare(
        'SELECT id, user_id, note_id, file_name, mime_type, encrypted_dek, r2_key, size, created_at FROM media WHERE id = ? AND user_id = ?'
      )
      .bind(id, userId)
      .first<{
        id: string;
        user_id: string;
        note_id: string | null;
        file_name: string;
        mime_type: string;
        encrypted_dek: string;
        r2_key: string;
        size: number;
        created_at: number;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      noteId: result.note_id,
      fileName: result.file_name,
      mimeType: result.mime_type,
      encryptedDek: result.encrypted_dek,
      r2Key: result.r2_key,
      size: result.size,
      createdAt: result.created_at,
    };
  }

  async findByNoteId(noteId: string, userId: string): Promise<Media[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, user_id, note_id, file_name, mime_type, encrypted_dek, r2_key, size, created_at FROM media WHERE note_id = ? AND user_id = ?'
      )
      .bind(noteId, userId)
      .all<{
        id: string;
        user_id: string;
        note_id: string | null;
        file_name: string;
        mime_type: string;
        encrypted_dek: string;
        r2_key: string;
        size: number;
        created_at: number;
      }>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      noteId: row.note_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      encryptedDek: row.encrypted_dek,
      r2Key: row.r2_key,
      size: row.size,
      createdAt: row.created_at,
    }));
  }

  async create(media: Media): Promise<Media> {
    await this.db
      .prepare(
        'INSERT INTO media (id, user_id, note_id, file_name, mime_type, encrypted_dek, r2_key, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        media.id,
        media.userId,
        media.noteId,
        media.fileName,
        media.mimeType,
        media.encryptedDek,
        media.r2Key,
        media.size,
        media.createdAt
      )
      .run();

    return media;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM media WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }

  async deleteByNoteId(noteId: string, userId: string): Promise<Media[]> {
    const mediaList = await this.findByNoteId(noteId, userId);
    if (mediaList.length > 0) {
      await this.db
        .prepare('DELETE FROM media WHERE note_id = ? AND user_id = ?')
        .bind(noteId, userId)
        .run();
    }
    return mediaList;
  }
}
