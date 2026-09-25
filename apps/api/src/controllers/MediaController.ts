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

  private static readonly SAFE_INLINE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/ogg',
  ]);

  private resolveSafeMimeType(mimeType: string): string {
    const trimmed = (mimeType || '').trim().toLowerCase();
    if (
      !trimmed ||
      /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml|application\/javascript|text\/javascript|application\/x-javascript)/i.test(
        trimmed
      )
    ) {
      return 'application/octet-stream';
    }
    return trimmed;
  }

  private resolveContentDisposition(mimeType: string, fileName: string): string {
    const trimmedMime = (mimeType || '').trim().toLowerCase();
    const isSafeInline = MediaController.SAFE_INLINE_MIME_TYPES.has(trimmedMime);
    const dispositionType = isSafeInline ? 'inline' : 'attachment';

    const cleanFileName =
      (fileName || 'download')
        .replace(/[\r\n"\\;]/g, '_')
        .trim() || 'download';
    const encodedFileName = encodeURIComponent(cleanFileName);

    return `${dispositionType}; filename="${cleanFileName}"; filename*=UTF-8''${encodedFileName}`;
  }

  async getMedia(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const mediaId = ctx.params.id;

    const { media, stream, size } = await this.mediaService.getMediaStream(mediaId, userId);

    const safeMimeType = this.resolveSafeMimeType(media.mimeType);
    const contentDisposition = this.resolveContentDisposition(media.mimeType, media.fileName);

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': safeMimeType,
        'Content-Length': size.toString(),
        'Content-Disposition': contentDisposition,
        'X-Content-Type-Options': 'nosniff',
        'X-Encrypted-DEK': media.encryptedDek,
        'X-File-Name': encodeURIComponent(media.fileName),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  }
}
