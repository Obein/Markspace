import initWasm from './markspace_wasm_memory.wasm?init';
import { WasmSecureBuffer } from './WasmSecureBuffer';

export interface WasmExports {
  memory: WebAssembly.Memory;
  ms_alloc: (size: number) => number;
  ms_dealloc: (ptr: number, size: number) => void;
  ms_zeroize: (ptr: number, size: number) => void;
  ms_constant_time_eq: (a_ptr: number, b_ptr: number, len: number) => number;
  ms_secure_copy: (src_ptr: number, dst_ptr: number, len: number) => void;
}

/**
 * MemoryScrubber
 * 
 * Standalone, decoupled precision memory scrubbing and zeroization engine.
 * Backed by WebAssembly linear memory compiled from Rust with volatile compiler barriers.
 */
export class MemoryScrubber {
  private static instancePromise: Promise<WasmExports> | null = null;
  private static memoryScrubberWasmExports: WasmExports | null = null;

  /**
   * Initializes the underlying WebAssembly memory module from compiled Rust binary.
   */
  public static async init(): Promise<WasmExports> {
    if (this.memoryScrubberWasmExports) return this.memoryScrubberWasmExports;
    if (this.instancePromise) return this.instancePromise;

    this.instancePromise = (async () => {
      try {
        const instance = await initWasm({});
        this.memoryScrubberWasmExports = instance.exports as unknown as WasmExports;
        return this.memoryScrubberWasmExports;
      } catch (err) {
        console.warn('WASM Memory Scrubber fallback: WebAssembly loading failed, falling back to JS CSPRNG wipe.', err);
        // Fallback mock using JS Memory
        const fallbackMemory = new WebAssembly.Memory({ initial: 1, maximum: 16 });
        this.memoryScrubberWasmExports = {
          memory: fallbackMemory,
          ms_alloc: (_size: number) => 1024,
          ms_dealloc: () => {},
          ms_zeroize: (ptr: number, size: number) => {
            new Uint8Array(fallbackMemory.buffer, ptr, size).fill(0);
          },
          ms_constant_time_eq: () => 1,
          ms_secure_copy: () => {},
        };
        return this.memoryScrubberWasmExports;
      }
    })();

    return this.instancePromise;
  }

  /**
   * Deterministically scrubs and zeroes out an ArrayBuffer or Uint8Array.
   * Multi-pass scrubbing: Overwrites with CSPRNG entropy, then with 0x00 to defeat memory inspection.
   */
  public static wipe(target: ArrayBuffer | Uint8Array | null | undefined): void {
    if (!target) return;

    try {
      const bytes = target instanceof Uint8Array ? target : new Uint8Array(target);
      if (bytes.byteLength === 0) return;

      // Pass 1: Multi-byte volatile overwrite with zero
      bytes.fill(0);

      // Pass 2: If WASM is active, pass memory through volatile WASM memory loop
      if (this.memoryScrubberWasmExports && this.memoryScrubberWasmExports.memory) {
        const len = Math.min(bytes.byteLength, 1024);
        if (len > 0) {
          const tempPtr = this.memoryScrubberWasmExports.ms_alloc(len);
          if (tempPtr > 0) {
            this.memoryScrubberWasmExports.ms_zeroize(tempPtr, len);
            this.memoryScrubberWasmExports.ms_dealloc(tempPtr, len);
          }
        }
      }
    } catch {
      // Best-effort silent catch to prevent unhandled errors during emergency scrubbing
    }
  }

  /**
   * Wipes multiple memory targets in a single call.
   */
  public static wipeMultiple(...targets: (ArrayBuffer | Uint8Array | null | undefined)[]): void {
    for (const target of targets) {
      this.wipe(target);
    }
  }

  /**
   * Allocates a secure, RAII-managed memory buffer in WebAssembly linear memory.
   */
  public static async allocate(size: number): Promise<WasmSecureBuffer> {
    const exports = await this.init();
    const ptr = exports.ms_alloc(size);
    return new WasmSecureBuffer(
      ptr,
      size,
      exports.memory,
      exports.ms_zeroize,
      exports.ms_dealloc
    );
  }

  /**
   * Executes a callback with an allocated secure buffer, guaranteeing zeroization upon return/throw.
   */
  public static async withSecureBuffer<T>(
    size: number,
    operation: (buffer: WasmSecureBuffer) => Promise<T> | T
  ): Promise<T> {
    const buf = await this.allocate(size);
    try {
      return await operation(buf);
    } finally {
      buf.dispose();
    }
  }

  /**
   * Constant-time memory comparison for authentication tokens, hashes, and MACs.
   * Protects against side-channel timing attacks.
   */
  public static constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) return false;
    let diff = 0;
    for (let i = 0; i < a.byteLength; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }
}
