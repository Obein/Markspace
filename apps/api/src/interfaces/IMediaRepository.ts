import { Media } from '../types/domain';

export interface IMediaRepository {
  findByIdAndUserId(id: string, userId: string): Promise<Media | null>;
  findByNoteId(noteId: string, userId: string): Promise<Media[]>;
  create(media: Media): Promise<Media>;
  delete(id: string, userId: string): Promise<boolean>;
  deleteByNoteId(noteId: string, userId: string): Promise<Media[]>;
}
