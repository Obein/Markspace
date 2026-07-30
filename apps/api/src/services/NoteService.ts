import { IMediaRepository } from '../interfaces/IMediaRepository';
import { INoteRepository } from '../interfaces/INoteRepository';
import { IStorageService } from '../interfaces/IStorageService';
import { CreateNoteDTO, Note, NoteMetadata, UpdateNoteDTO } from '../types/domain';

export class NoteService {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly mediaRepository: IMediaRepository,
    private readonly storageService: IStorageService
  ) {}

  async getNotesList(userId: string): Promise<NoteMetadata[]> {
    return this.noteRepository.findAllByUserId(userId);
  }

  async getNoteById(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findByIdAndUserId(id, userId);
    if (!note) {
      throw new Error('NOTE_NOT_FOUND: Note does not exist or access denied');
    }
    return note;
  }

  async createNote(userId: string, dto: CreateNoteDTO): Promise<Note> {
    if (!dto.encryptedTitle || !dto.encryptedPayload || !dto.encryptedDek) {
      throw new Error('INVALID_INPUT: encryptedTitle, encryptedPayload, and encryptedDek are required');
    }

    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      userId,
      encryptedTitle: dto.encryptedTitle,
      encryptedPayload: dto.encryptedPayload,
      encryptedDek: dto.encryptedDek,
      createdAt: now,
      updatedAt: now,
    };

    return this.noteRepository.create(note);
  }

  async updateNote(id: string, userId: string, dto: UpdateNoteDTO): Promise<Note> {
    const existingNote = await this.noteRepository.findByIdAndUserId(id, userId);
    if (!existingNote) {
      throw new Error('NOTE_NOT_FOUND: Note does not exist or access denied');
    }

    const updatedNote: Note = {
      ...existingNote,
      encryptedTitle: dto.encryptedTitle ?? existingNote.encryptedTitle,
      encryptedPayload: dto.encryptedPayload ?? existingNote.encryptedPayload,
      encryptedDek: dto.encryptedDek ?? existingNote.encryptedDek,
      updatedAt: Date.now(),
    };

    return this.noteRepository.update(updatedNote);
  }

  async deleteNote(id: string, userId: string): Promise<void> {
    const existingNote = await this.noteRepository.findByIdAndUserId(id, userId);
    if (!existingNote) {
      throw new Error('NOTE_NOT_FOUND: Note does not exist or access denied');
    }

    const associatedMedia = await this.mediaRepository.deleteByNoteId(id, userId);
    const r2Keys = associatedMedia.map((m) => m.r2Key);
    if (r2Keys.length > 0) {
      await this.storageService.deleteMultiple(r2Keys);
    }

    await this.noteRepository.delete(id, userId);
  }
}
