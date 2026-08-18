/**
 * ChunkCryptoEngine.ts
 * Zero-Knowledge Content-Addressed Chunk Encryption Engine.
 *
 * Derives deterministic, user-isolated Chunk IDs and encryption keys from content hashes and the Vault Master Key (VMK).
 * Guarantees that:
 * 1. Identical plaintext chunks in a user's vault produce identical Chunk IDs (enabling blind de-duplication).
 * 2. Cross-user isolation: Different users with different VMKs produce completely unrelated Chunk IDs and ciphertexts for the same content.
 */

export interface ProcessedChunk {
  chunkId: string;        // Deterministic content-addressed identifier (64 hex chars)
  plainSize: number;      // Original plaintext byte length
  cipherSize: number;     // Encrypted ciphertext byte length
  cipherData: Uint8Array; // Raw encrypted payload (AES-256-GCM)
}

export class ChunkCryptoEngine {
  /**
   * Encrypts a single plaintext chunk deterministically using VMK-derived keys.
   */
  public static async encryptChunk(
    chunkData: Uint8Array,
    vmk: CryptoKey
  ): Promise<ProcessedChunk> {
    // 1. Compute 32-byte content hash H = SHA-256(chunkData)
    const contentHashBuffer = await crypto.subtle.digest('SHA-256', chunkData as unknown as BufferSource);
    const contentHashBytes = new Uint8Array(contentHashBuffer);

    // 2. Export raw VMK bytes for deterministic HMAC derivations
    const rawVmk = await crypto.subtle.exportKey('raw', vmk);

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      rawVmk as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // 3. Derive Chunk ID = Hex(HMAC-SHA256(VMK, "chunk-id:" + ContentHash))
    const idPrefix = new TextEncoder().encode('chunk-id:');
    const idMsg = new Uint8Array(idPrefix.length + contentHashBytes.length);
    idMsg.set(idPrefix, 0);
    idMsg.set(contentHashBytes, idPrefix.length);

    const chunkIdBuffer = await crypto.subtle.sign('HMAC', hmacKey, idMsg as unknown as BufferSource);
    const chunkId = Array.from(new Uint8Array(chunkIdBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const chunkIdBytes = new TextEncoder().encode(chunkId);

    // 4. Derive Chunk Encryption Key = HMAC-SHA256(VMK, "chunk-key:" + chunkId)
    const keyPrefix = new TextEncoder().encode('chunk-key:');
    const keyMsg = new Uint8Array(keyPrefix.length + chunkIdBytes.length);
    keyMsg.set(keyPrefix, 0);
    keyMsg.set(chunkIdBytes, keyPrefix.length);
    const chunkKeyBuffer = await crypto.subtle.sign('HMAC', hmacKey, keyMsg as unknown as BufferSource);

    const chunkKey = await crypto.subtle.importKey(
      'raw',
      chunkKeyBuffer as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // 5. Derive Deterministic Synthetic 12-byte IV = HMAC-SHA256(VMK, "chunk-iv:" + chunkId)[0..12]
    const ivPrefix = new TextEncoder().encode('chunk-iv:');
    const ivMsg = new Uint8Array(ivPrefix.length + chunkIdBytes.length);
    ivMsg.set(ivPrefix, 0);
    ivMsg.set(chunkIdBytes, ivPrefix.length);
    const ivBuffer = await crypto.subtle.sign('HMAC', hmacKey, ivMsg as unknown as BufferSource);
    const iv = new Uint8Array(ivBuffer).slice(0, 12);

    // 6. AES-256-GCM Encrypt
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      chunkKey,
      chunkData as unknown as BufferSource
    );

    const cipherData = new Uint8Array(cipherBuffer);

    return {
      chunkId,
      plainSize: chunkData.byteLength,
      cipherSize: cipherData.byteLength,
      cipherData,
    };
  }

  /**
   * Decrypts a ciphertext chunk given its Chunk ID and the user's VMK.
   */
  public static async decryptChunk(
    cipherData: Uint8Array | ArrayBuffer,
    chunkId: string,
    vmk: CryptoKey
  ): Promise<Uint8Array> {
    const cipherBytes = cipherData instanceof ArrayBuffer ? new Uint8Array(cipherData) : cipherData;
    if (cipherBytes.byteLength === 0) {
      return new Uint8Array(0);
    }

    const rawVmk = await crypto.subtle.exportKey('raw', vmk);

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      rawVmk as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const chunkIdBytes = new TextEncoder().encode(chunkId);

    // 1. Re-derive Chunk Key = HMAC-SHA256(VMK, "chunk-key:" + chunkId)
    const keyPrefix = new TextEncoder().encode('chunk-key:');
    const keyMsg = new Uint8Array(keyPrefix.length + chunkIdBytes.length);
    keyMsg.set(keyPrefix, 0);
    keyMsg.set(chunkIdBytes, keyPrefix.length);
    const chunkKeyBuffer = await crypto.subtle.sign('HMAC', hmacKey, keyMsg as unknown as BufferSource);

    const chunkKey = await crypto.subtle.importKey(
      'raw',
      chunkKeyBuffer as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // 2. Re-derive Synthetic IV = HMAC-SHA256(VMK, "chunk-iv:" + chunkId)[0..12]
    const ivPrefix = new TextEncoder().encode('chunk-iv:');
    const ivMsg = new Uint8Array(ivPrefix.length + chunkIdBytes.length);
    ivMsg.set(ivPrefix, 0);
    ivMsg.set(chunkIdBytes, ivPrefix.length);
    const ivBuffer = await crypto.subtle.sign('HMAC', hmacKey, ivMsg as unknown as BufferSource);
    const iv = new Uint8Array(ivBuffer).slice(0, 12);

    // 3. AES-256-GCM Decrypt
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      chunkKey,
      cipherBytes as unknown as BufferSource
    );

    return new Uint8Array(plainBuffer);
  }

  /**
   * Helper: Process multiple slices in parallel.
   */
  public static async processChunks(
    chunks: Array<{ data: Uint8Array }>,
    vmk: CryptoKey
  ): Promise<ProcessedChunk[]> {
    return Promise.all(
      chunks.map((c) => this.encryptChunk(c.data, vmk))
    );
  }
}
