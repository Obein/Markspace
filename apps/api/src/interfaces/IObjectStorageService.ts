export interface IObjectStorageService {
  /**
   * Uploads an object payload blob to Object Storage (R2).
   */
  putObject(key: string, body: ArrayBuffer | Uint8Array | string, contentType?: string): Promise<void>;

  /**
   * Retrieves an object payload blob from Object Storage (R2).
   */
  getObject(key: string): Promise<{ body: ReadableStream | ArrayBuffer; contentType: string; size: number } | null>;

  /**
   * Deletes an object blob from Object Storage (R2).
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Deletes multiple object blobs from Object Storage (R2).
   */
  deleteObjects(keys: string[]): Promise<void>;
}
