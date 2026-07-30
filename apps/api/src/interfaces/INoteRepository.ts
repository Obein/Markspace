import { Note, NoteMetadata } from '../types/domain';

export interface INoteRepository {
  findAllByUserId(userId: string): Promise<NoteMetadata[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Note | null>;
  create(note: Note): Promise<Note>;
  update(note: Note): Promise<Note>;
  delete(id: string, userId: string): Promise<boolean>;
}
