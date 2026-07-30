import { MediaService } from '../services/MediaService';
import { UploadMediaDTO } from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  async prepareUpload(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as UploadMediaDTO;
    const media = await this.mediaService.prepareUpload(userId, body);

    const response: ApiResponse = {
      success: true,
      data: {
        media,
        uploadUrl: `/api/v1/media/${media.id}/content`,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async uploadContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const mediaId = ctx.params.id;

    if (!ctx.request.body) {
      throw new Error('INVALID_INPUT: Request body cannot be empty for binary upload');
    }

    await this.mediaService.uploadContent(mediaId, userId, ctx.request.body);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Encrypted media binary stored successfully' },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getMedia(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const mediaId = ctx.params.id;

    const { media, stream, size } = await this.mediaService.getMediaStream(mediaId, userId);

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': size.toString(),
        'X-Encrypted-DEK': media.encryptedDek,
        'X-File-Name': encodeURIComponent(media.fileName),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  }
}
