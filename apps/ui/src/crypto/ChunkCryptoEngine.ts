/**
 * ChunkCryptoEngine.ts
 * Zero-Knowledge Content-Addressed Chunk Encryption Engine.
 *
 * Operates directly on non-extractable WebCrypto AES-GCM keys (extractable: false)
 * without requiring subtle.exportKey, ensuring maximum hardware security and cold-boot dump prevention.
 *
 * Guarantees:
 * 1. Determinism: Identical plaintext chunks in a user's vault produce identical Chunk IDs (enabling blind de-duplication).
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
   * Encrypts a single plaintext chunk deterministically using the non-extractable VMK.
   */
  public static async encryptChunk(
    chunkData: Uint8Array,
    vmk: CryptoKey
  ): Promise<ProcessedChunk> {
    // 1. Compute 32-byte content hash H = SHA-256(chunkData)
    const contentHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      chunkData as unknown as BufferSource
    );
    const contentHashBytes = new Uint8Array(contentHashBuffer);

    // 2. Encrypt ContentHash with VMK using zero IV to derive deterministic pseudo-random token
    const zeroIv = new Uint8Array(12);
    const tokenBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: zeroIv as unknown as BufferSource },
      vmk,
      contentHashBytes as unknown as BufferSource
    );

    // 3. Derive Chunk ID = Hex(SHA-256(tokenBuffer))
    const chunkIdBuffer = await crypto.subtle.digest(
      'SHA-256',
      tokenBuffer as unknown as BufferSource
    );
    const chunkId = Array.from(new Uint8Array(chunkIdBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // 4. Derive Deterministic Synthetic 12-byte IV = SHA-256("chunk-iv:" + chunkId)[0..12]
    const ivMsg = new TextEncoder().encode(`chunk-iv:${chunkId}`);
    const ivBuffer = await crypto.subtle.digest(
      'SHA-256',
      ivMsg as unknown as BufferSource
    );
    const iv = new Uint8Array(ivBuffer).slice(0, 12);

    // 5. AES-256-GCM Encrypt chunk payload with VMK and synthetic IV
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      vmk,
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
   * Decrypts a ciphertext chunk given its Chunk ID and the user's non-extractable VMK.
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

    // 1. Re-derive Synthetic IV = SHA-256("chunk-iv:" + chunkId)[0..12]
    const ivMsg = new TextEncoder().encode(`chunk-iv:${chunkId}`);
    const ivBuffer = await crypto.subtle.digest(
      'SHA-256',
      ivMsg as unknown as BufferSource
    );
    const iv = new Uint8Array(ivBuffer).slice(0, 12);

    // 2. AES-256-GCM Decrypt
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      vmk,
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
