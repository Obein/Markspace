/**
 * ChunkLocalCache.ts
 * High-performance IndexedDB local cache for Content-Addressed Chunks and Manifests.
 * Enables zero-network instant document reconstruction for cached blocks.
 */

const DB_NAME = 'markspace_cas_cache_v1';
const DB_VERSION = 1;
const STORE_CHUNKS = 'chunks';
const STORE_MANIFESTS = 'manifests';

export class ChunkLocalCache {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported in current environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
          db.createObjectStore(STORE_CHUNKS, { keyPath: 'chunkId' });
        }
        if (!db.objectStoreNames.contains(STORE_MANIFESTS)) {
          db.createObjectStore(STORE_MANIFESTS, { keyPath: 'manifestId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Retrieves a decrypted plain chunk from local IndexedDB cache.
   */
  public static async getChunk(chunkId: string): Promise<Uint8Array | null> {
    try {
      const db = await this.getDB();
      return new Promise<Uint8Array | null>((resolve) => {
        const tx = db.transaction(STORE_CHUNKS, 'readonly');
        const store = tx.objectStore(STORE_CHUNKS);
        const req = store.get(chunkId);
        req.onsuccess = () => {
          if (req.result && req.result.plainData) {
            resolve(req.result.plainData as Uint8Array);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Caches a decrypted plain chunk in local IndexedDB.
   */
  public static async setChunk(chunkId: string, plainData: Uint8Array): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CHUNKS, 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      store.put({
        chunkId,
        plainData,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to cache chunk in IndexedDB:', err);
    }
  }

  /**
   * Batch retrieve multiple chunks from local cache. Returns map of found chunkIds.
   */
  public static async getChunks(chunkIds: string[]): Promise<Map<string, Uint8Array>> {
    const results = new Map<string, Uint8Array>();
    await Promise.all(
      chunkIds.map(async (id) => {
        const data = await this.getChunk(id);
        if (data) {
          results.set(id, data);
        }
      })
    );
    return results;
  }

  // --- Fast In-Memory Presence Tracking for 1-Step Bundle Sync ---
  private static knownUploadedChunkIds = new Set<string>();

  public static isChunkUploaded(chunkId: string): boolean {
    return this.knownUploadedChunkIds.has(chunkId);
  }

  public static markChunkUploaded(chunkId: string): void {
    this.knownUploadedChunkIds.add(chunkId);
  }

  public static markChunksUploaded(chunkIds: string[]): void {
    for (const id of chunkIds) {
      this.knownUploadedChunkIds.add(id);
    }
  }

  public static clearUploadedChunk(chunkId: string): void {
    this.knownUploadedChunkIds.delete(chunkId);
  }

  public static clearUploadedChunks(chunkIds: string[]): void {
    for (const id of chunkIds) {
      this.knownUploadedChunkIds.delete(id);
    }
  }
}
