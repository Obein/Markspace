/**
 * MerkleManifestService.ts
 * Manages construction, validation, Merkle root hash computation, and encryption of version manifests.
 */

export interface FileManifestChunkRef {
  chunkId: string;
  plainSize: number;
  cipherSize: number;
}

export interface FileManifest {
  manifestId: string;        // Merkle root hash of all ordered chunk IDs
  nodeId: string;            // Target document node ID
  path: string;              // Target file path
  parentManifestId?: string; // Parent commit hash in the Merkle DAG
  totalPlainSize: number;    // Reconstructed plaintext byte length
  totalCipherSize: number;   // Total encrypted ciphertext byte length
  chunks: FileManifestChunkRef[];
  createdAt: number;
  commitMessage?: string;
}

export class MerkleManifestService {
  /**
   * Computes deterministic Merkle Root Hash for a list of ordered chunk IDs.
   */
  public static async computeManifestId(
    nodeId: string,
    chunks: FileManifestChunkRef[],
    parentManifestId?: string
  ): Promise<string> {
    const serializedTopology = `${nodeId}:${parentManifestId || 'root'}:${chunks.map((c) => c.chunkId).join(',')}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serializedTopology));
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Encrypts a FileManifest structure into a secure binary payload using VMK.
   */
  public static async encryptManifest(
    manifest: FileManifest,
    vmk: CryptoKey
  ): Promise<Uint8Array> {
    const rawJson = JSON.stringify(manifest);
    const plainBuffer = new TextEncoder().encode(rawJson);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      vmk,
      plainBuffer
    );

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);
    return combined;
  }

  /**
   * Decrypts an encrypted FileManifest binary payload using VMK.
   */
  public static async decryptManifest(
    encryptedData: ArrayBuffer | Uint8Array,
    vmk: CryptoKey
  ): Promise<FileManifest> {
    const combined = encryptedData instanceof ArrayBuffer ? new Uint8Array(encryptedData) : encryptedData;
    if (combined.byteLength < 12) {
      throw new Error('CORRUPT_MANIFEST: Payload is smaller than 12-byte IV');
    }

    const iv = combined.slice(0, 12);
    const cipherData = combined.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      vmk,
      cipherData
    );

    const jsonStr = new TextDecoder().decode(plainBuffer);
    return JSON.parse(jsonStr) as FileManifest;
  }
}
