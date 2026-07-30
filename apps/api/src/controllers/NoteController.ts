import { NoteService } from '../services/NoteService';
import { CreateNoteDTO, UpdateNoteDTO } from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  async listNotes(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const notes = await this.noteService.getNotesList(userId);

    const response: ApiResponse = {
      success: true,
      data: notes,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getNote(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const noteId = ctx.params.id;
    const note = await this.noteService.getNoteById(noteId, userId);

    const response: ApiResponse = {
      success: true,
      data: note,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async createNote(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as CreateNoteDTO;
    const note = await this.noteService.createNote(userId, body);

    const response: ApiResponse = {
      success: true,
      data: note,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateNote(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const noteId = ctx.params.id;
    const body = (await ctx.request.json()) as UpdateNoteDTO;
    const updatedNote = await this.noteService.updateNote(noteId, userId, body);

    const response: ApiResponse = {
      success: true,
      data: updatedNote,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteNote(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const noteId = ctx.params.id;
    await this.noteService.deleteNote(noteId, userId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Note and associated media deleted successfully' },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
