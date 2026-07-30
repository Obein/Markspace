import { IStorageService } from '../interfaces/IStorageService';

export class R2StorageService implements IStorageService {
  constructor(private readonly bucket: R2Bucket) {}

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | Blob,
    httpMetadata?: { contentType?: string }
  ): Promise<void> {
    await this.bucket.put(key, value, {
      httpMetadata: httpMetadata?.contentType ? { contentType: httpMetadata.contentType } : undefined,
    });
  }

  async get(key: string): Promise<{ body: ReadableStream; contentType?: string; size: number } | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;

    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType,
      size: object.size,
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.bucket.delete(keys);
  }
}
