/**
 * WasmSecureBuffer
 * 
 * RAII-managed secure memory buffer allocated directly within WebAssembly linear memory.
 * Ensures deterministic, hardware-level memory zeroization upon disposal.
 */
export class WasmSecureBuffer {
  private _isDisposed = false;

  constructor(
    public readonly ptr: number,
    public readonly size: number,
    private readonly memory: WebAssembly.Memory,
    private readonly wasmZeroize: (ptr: number, size: number) => void,
    private readonly wasmDealloc: (ptr: number, size: number) => void
  ) {}

  /**
   * Returns a live Uint8Array view into the WebAssembly linear memory.
   * Throws if the buffer has already been disposed.
   */
  public get bytes(): Uint8Array {
    if (this._isDisposed) {
      throw new Error('ILLEGAL_ACCESS: WasmSecureBuffer has already been zeroized and disposed.');
    }
    return new Uint8Array(this.memory.buffer, this.ptr, this.size);
  }

  /**
   * Returns whether this buffer has been disposed/wiped.
   */
  public get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Copies input bytes securely into this WASM memory buffer.
   */
  public write(source: Uint8Array | ArrayBuffer): void {
    if (this._isDisposed) {
      throw new Error('ILLEGAL_ACCESS: Cannot write to a disposed WasmSecureBuffer.');
    }
    const srcBytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    const len = Math.min(srcBytes.byteLength, this.size);
    this.bytes.set(srcBytes.subarray(0, len));
  }

  /**
   * Clones the current WASM bytes into a standard ArrayBuffer.
   */
  public toArrayBuffer(): ArrayBuffer {
    if (this._isDisposed) {
      throw new Error('ILLEGAL_ACCESS: Cannot read from a disposed WasmSecureBuffer.');
    }
    const copy = new Uint8Array(this.size);
    copy.set(this.bytes);
    return copy.buffer;
  }

  /**
   * Deterministically overwrites this buffer with 0x00 via WASM volatile memory operations.
   */
  public zeroize(): void {
    if (this._isDisposed || this.ptr === 0 || this.size === 0) return;
    try {
      this.wasmZeroize(this.ptr, this.size);
    } catch {
      // Fallback in case of memory detachment
      if (this.memory.buffer.byteLength >= this.ptr + this.size) {
        new Uint8Array(this.memory.buffer, this.ptr, this.size).fill(0);
      }
    }
  }

  /**
   * RAII disposal: Zeroizes the memory buffer and releases allocation.
   */
  public dispose(): void {
    if (this._isDisposed) return;
    this.zeroize();
    if (this.ptr !== 0 && this.size !== 0) {
      try {
        this.wasmDealloc(this.ptr, this.size);
      } catch {
        // Ignored if allocator already recycled
      }
    }
    this._isDisposed = true;
  }

  /**
   * TypeScript Explicit Resource Management hook (`using buffer = ...`).
   */
  public [Symbol.dispose](): void {
    this.dispose();
  }
}
