import { IMediaRepository } from '../interfaces/IMediaRepository';
import { IStorageService } from '../interfaces/IStorageService';
import { Media, UploadMediaDTO } from '../types/domain';

export class MediaService {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly storageService: IStorageService
  ) {}

  async prepareUpload(userId: string, dto: UploadMediaDTO): Promise<Media> {
    if (!dto.fileName || !dto.mimeType || !dto.encryptedDek || !dto.size) {
      throw new Error('INVALID_INPUT: fileName, mimeType, encryptedDek, and size are required');
    }

    const mediaId = crypto.randomUUID();
    const r2Key = `users/${userId}/media/${mediaId}`;

    const media: Media = {
      id: mediaId,
      userId,
      noteId: dto.noteId || null,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      encryptedDek: dto.encryptedDek,
      r2Key,
      size: dto.size,
      createdAt: Date.now(),
    };

    return this.mediaRepository.create(media);
  }

  async uploadContent(
    mediaId: string,
    userId: string,
    stream: ReadableStream | ArrayBuffer
  ): Promise<void> {
    const media = await this.mediaRepository.findByIdAndUserId(mediaId, userId);
    if (!media) {
      throw new Error('MEDIA_NOT_FOUND: Media metadata record not found or access denied');
    }

    await this.storageService.put(media.r2Key, stream, { contentType: media.mimeType });
  }

  async getMediaStream(
    id: string,
    userId: string
  ): Promise<{ media: Media; stream: ReadableStream; size: number }> {
    const media = await this.mediaRepository.findByIdAndUserId(id, userId);
    if (!media) {
      throw new Error('MEDIA_NOT_FOUND: Media record not found or access denied');
    }

    const object = await this.storageService.get(media.r2Key);
    if (!object) {
      throw new Error('MEDIA_FILE_MISSING: Binary media content not found in object storage');
    }

    return {
      media,
      stream: object.body,
      size: object.size,
    };
  }
}
