import { INoteRepository } from '../interfaces/INoteRepository';
import { Note, NoteMetadata } from '../types/domain';

export class D1NoteRepository implements INoteRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByUserId(userId: string): Promise<NoteMetadata[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, encrypted_title, encrypted_dek, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC'
      )
      .bind(userId)
      .all<{
        id: string;
        encrypted_title: string;
        encrypted_dek: string;
        created_at: number;
        updated_at: number;
      }>();

    return (results || []).map((row) => ({
      id: row.id,
      encryptedTitle: row.encrypted_title,
      encryptedDek: row.encrypted_dek,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Note | null> {
    const result = await this.db
      .prepare(
        'SELECT id, user_id, encrypted_title, encrypted_payload, encrypted_dek, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?'
      )
      .bind(id, userId)
      .first<{
        id: string;
        user_id: string;
        encrypted_title: string;
        encrypted_payload: string;
        encrypted_dek: string;
        created_at: number;
        updated_at: number;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      encryptedTitle: result.encrypted_title,
      encryptedPayload: result.encrypted_payload,
      encryptedDek: result.encrypted_dek,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async create(note: Note): Promise<Note> {
    await this.db
      .prepare(
        'INSERT INTO notes (id, user_id, encrypted_title, encrypted_payload, encrypted_dek, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        note.id,
        note.userId,
        note.encryptedTitle,
        note.encryptedPayload,
        note.encryptedDek,
        note.createdAt,
        note.updatedAt
      )
      .run();

    return note;
  }

  async update(note: Note): Promise<Note> {
    await this.db
      .prepare(
        'UPDATE notes SET encrypted_title = ?, encrypted_payload = ?, encrypted_dek = ?, updated_at = ? WHERE id = ? AND user_id = ?'
      )
      .bind(
        note.encryptedTitle,
        note.encryptedPayload,
        note.encryptedDek,
        note.updatedAt,
        note.id,
        note.userId
      )
      .run();

    return note;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }
}
