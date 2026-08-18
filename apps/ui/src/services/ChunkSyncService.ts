/**
 * ChunkSyncService.ts
 * Orchestrates FastCDC dynamic chunking, differential missing-chunk synchronization,
 * Merkle DAG manifest commitment, and zero-network local cache reconstruction.
 */

import { ChunkCryptoEngine, ProcessedChunk } from '../crypto/ChunkCryptoEngine';
import { ChunkLocalCache } from '../crypto/ChunkLocalCache';
import { FastCDC } from '../crypto/FastCDC';
import { FileManifest, FileManifestChunkRef, MerkleManifestService } from '../crypto/MerkleManifestService';
import { IApiClient } from '../interfaces/IApiClient';

export interface SyncDocumentResult {
  manifest: FileManifest;
  uploadedChunksCount: number;
  reusedChunksCount: number;
  totalChunksCount: number;
  totalPlainSize: number;
  uploadedBytes: number;
}

export class ChunkSyncService {
  private static cdc = new FastCDC({
    minSize: 512,
    avgSize: 1024,
    maxSize: 4096,
  });

  /**
   * Performs differential block-level synchronization for a document.
   */
  public static async syncDocument(
    apiClient: IApiClient,
    nodeId: string,
    path: string,
    content: string | Uint8Array,
    vmk: CryptoKey,
    parentManifestId?: string,
    commitMessage?: string
  ): Promise<SyncDocumentResult> {
    // 1. Dynamic content-defined chunking
    const slices = this.cdc.chunk(content);
    if (slices.length === 0) {
      // Empty document edge case
      slices.push({
        offset: 0,
        length: 0,
        data: new Uint8Array(0),
      });
    }

    // 2. Deterministic chunk encryption and Chunk ID derivation
    const processedChunks: ProcessedChunk[] = await ChunkCryptoEngine.processChunks(
      slices,
      vmk
    );

    const chunkIds = processedChunks.map((c) => c.chunkId);
    const chunkMap = new Map<string, ProcessedChunk>();
    for (let i = 0; i < processedChunks.length; i++) {
      const pc = processedChunks[i];
      chunkMap.set(pc.chunkId, pc);
      // Cache local plain slice in IndexedDB
      await ChunkLocalCache.setChunk(pc.chunkId, slices[i].data);
    }

    // 3. Construct Merkle Manifest
    const chunkRefs: FileManifestChunkRef[] = processedChunks.map((c) => ({
      chunkId: c.chunkId,
      plainSize: c.plainSize,
      cipherSize: c.cipherSize,
    }));

    const manifestId = await MerkleManifestService.computeManifestId(
      nodeId,
      chunkRefs,
      parentManifestId
    );

    const totalPlainSize = chunkRefs.reduce((acc, cur) => acc + cur.plainSize, 0);
    const totalCipherSize = chunkRefs.reduce((acc, cur) => acc + cur.cipherSize, 0);

    const manifest: FileManifest = {
      manifestId,
      nodeId,
      path,
      parentManifestId,
      totalPlainSize,
      totalCipherSize,
      chunks: chunkRefs,
      createdAt: Date.now(),
      commitMessage,
    };

    // 4. Encrypt Manifest
    const encryptedManifest = await MerkleManifestService.encryptManifest(manifest, vmk);

    // 5. Assemble Atomic 1-Step Commit Bundle (Only 1 HTTP Request during save)
    const buildBundleFormData = (
      forceIncludeChunkIds?: Set<string>
    ): { formData: FormData; deltaBytes: number; deltaCount: number } => {
      const formData = new FormData();
      const meta = {
        nodeId,
        manifestId,
        parentManifestId,
        plainSize: totalPlainSize,
        cipherSize: totalCipherSize,
        commitMessage,
        chunkIds,
      };

      formData.append('meta', JSON.stringify(meta));
      formData.append(
        'manifest',
        new Blob([encryptedManifest as BlobPart], { type: 'application/octet-stream' }),
        manifestId
      );

      let deltaBytes = 0;
      let deltaCount = 0;

      for (const pc of processedChunks) {
        const isUnknown = !ChunkLocalCache.isChunkUploaded(pc.chunkId);
        const isForced = forceIncludeChunkIds?.has(pc.chunkId);

        if (isUnknown || isForced) {
          formData.append(
            `chunk_${pc.chunkId}`,
            new Blob([pc.cipherData as BlobPart], { type: 'application/octet-stream' }),
            pc.chunkId
          );
          deltaBytes += pc.cipherSize;
          deltaCount++;
        }
      }

      return { formData, deltaBytes, deltaCount };
    };

    // 6. Send Atomic 1-Step Bundle (1 Request)
    let bundle = buildBundleFormData();
    let commitRes = await apiClient.commitSyncBundle(bundle.formData);

    // 7. Self-Healing Loop: In case server integrity barrier detected missing chunks
    if (!commitRes.success && commitRes.missingChunkIds && commitRes.missingChunkIds.length > 0) {
      ChunkLocalCache.clearUploadedChunks(commitRes.missingChunkIds);
      const forcedSet = new Set(commitRes.missingChunkIds);

      bundle = buildBundleFormData(forcedSet);
      commitRes = await apiClient.commitSyncBundle(bundle.formData);

      if (!commitRes.success) {
        throw new Error(
          'Differential sync failed after self-healing retry: missing chunks could not be reconciled'
        );
      }
    }

    // 8. On success: Mark all chunks as confirmed uploaded in presence cache
    ChunkLocalCache.markChunksUploaded(chunkIds);

    const uploadedCount = commitRes.uploadedChunksCount ?? bundle.deltaCount;

    return {
      manifest,
      uploadedChunksCount: uploadedCount,
      reusedChunksCount: chunkIds.length - uploadedCount,
      totalChunksCount: chunkIds.length,
      totalPlainSize,
      uploadedBytes: bundle.deltaBytes,
    };
  }

  /**
   * Reconstructs a document by downloading missing chunks and assembling from local cache.
   */
  public static async reconstructDocument(
    apiClient: IApiClient,
    manifestId: string,
    vmk: CryptoKey
  ): Promise<{ contentText: string; manifest: FileManifest }> {
    // 1. Fetch & Decrypt Manifest
    const encryptedManifest = await apiClient.fetchManifest(manifestId);
    const manifest = await MerkleManifestService.decryptManifest(encryptedManifest, vmk);

    if (manifest.chunks.length === 0) {
      return { contentText: '', manifest };
    }

    const chunkIds = manifest.chunks.map((c) => c.chunkId);

    // 2. Check local IndexedDB cache
    const cachedChunks = await ChunkLocalCache.getChunks(chunkIds);

    // 3. Download missing chunks
    const missingChunkIds = chunkIds.filter((id) => !cachedChunks.has(id));
    if (missingChunkIds.length > 0) {
      const concurrency = 6;
      for (let i = 0; i < missingChunkIds.length; i += concurrency) {
        const batch = missingChunkIds.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (chunkId) => {
            const cipherBuffer = await apiClient.fetchChunk(chunkId);
            const plainBytes = await ChunkCryptoEngine.decryptChunk(cipherBuffer, chunkId, vmk);
            cachedChunks.set(chunkId, plainBytes);
            await ChunkLocalCache.setChunk(chunkId, plainBytes);
          })
        );
      }
    }

    // 4. Assemble in strict order
    const totalSize = manifest.totalPlainSize;
    const fullBuffer = new Uint8Array(totalSize);
    let offset = 0;

    for (const ref of manifest.chunks) {
      const chunkData = cachedChunks.get(ref.chunkId);
      if (chunkData) {
        fullBuffer.set(chunkData, offset);
        offset += chunkData.byteLength;
      }
    }

    const contentText = new TextDecoder().decode(fullBuffer);
    return { contentText, manifest };
  }
}
