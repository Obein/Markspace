import { R2Bucket } from '@cloudflare/workers-types';
import { IObjectStorageService } from '../interfaces/IObjectStorageService';

export class R2ObjectStorageService implements IObjectStorageService {
  constructor(private readonly bucket: R2Bucket) {}

  public async putObject(
    key: string,
    body: ArrayBuffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
  ): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: {
        contentType,
      },
    });
  }

  public async getObject(
    key: string
  ): Promise<{ body: ReadableStream | ArrayBuffer; contentType: string; size: number } | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;

    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    const size = object.size;
    const arrayBuffer = await object.arrayBuffer();

    return {
      body: arrayBuffer,
      contentType,
      size,
    };
  }

  public async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  public async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.bucket.delete(keys);
  }
}
