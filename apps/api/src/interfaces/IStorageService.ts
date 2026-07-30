export interface IStorageService {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob, httpMetadata?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string; size: number } | null>;
  delete(key: string): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
}
