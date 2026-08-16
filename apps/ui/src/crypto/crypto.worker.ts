/// <reference lib="webworker" />

export interface WorkerCryptoRequest {
  taskId: string;
  type: 'DERIVE_CMK' | 'ENCRYPT_TEXT' | 'DECRYPT_TEXT';
  payload: any;
}

export interface WorkerCryptoResponse {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerCryptoRequest>) => {
  const { taskId, type, payload } = e.data;

  try {
    if (type === 'DERIVE_CMK') {
      const { password, salt } = payload;
      const encoder = new TextEncoder();
      const pwdBuffer = encoder.encode(password);
      const saltBuffer = encoder.encode(salt);

      const baseKey = await self.crypto.subtle.importKey(
        'raw',
        pwdBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const cmk = await self.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, // CRITICAL: Non-extractable key
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Memory scrubbing
      pwdBuffer.fill(0);
      saltBuffer.fill(0);

      self.postMessage({ taskId, success: true, result: { cmk } } as WorkerCryptoResponse);
    } else if (type === 'ENCRYPT_TEXT') {
      const { plainText, dek } = payload;
      const encoder = new TextEncoder();
      const plainBuffer = encoder.encode(plainText);
      const iv = self.crypto.getRandomValues(new Uint8Array(12));

      const cipherBuffer = await self.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        dek,
        plainBuffer
      );

      plainBuffer.fill(0); // Memory scrubbing

      const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipherBuffer), iv.length);

      self.postMessage(
        { taskId, success: true, result: { combinedBuffer: combined.buffer } } as WorkerCryptoResponse,
        [combined.buffer] // Zero-copy transferable
      );
    } else if (type === 'DECRYPT_TEXT') {
      const { combinedBuffer, dek } = payload;
      const combined = new Uint8Array(combinedBuffer);
      const iv = combined.slice(0, 12);
      const cipherData = combined.slice(12);

      const plainBuffer = await self.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        dek,
        cipherData
      );

      const text = new TextDecoder().decode(plainBuffer);
      self.postMessage({ taskId, success: true, result: { text } } as WorkerCryptoResponse);
    }
  } catch (err: any) {
    self.postMessage({
      taskId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    } as WorkerCryptoResponse);
  }
};

export {};
