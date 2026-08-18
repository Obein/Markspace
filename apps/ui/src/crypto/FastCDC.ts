/**
 * FastCDC.ts
 * High-performance Content-Defined Chunking (CDC) implementation in pure TypeScript.
 * Uses Gear-hash rolling algorithms to find natural content-defined boundaries,
 * avoiding the avalanche effect of fixed-size chunking.
 */

export interface FastCDCOptions {
  minSize?: number; // Minimum chunk size in bytes (default: 512B)
  avgSize?: number; // Average / target chunk size in bytes (default: 1KB)
  maxSize?: number; // Maximum chunk size in bytes (default: 4KB)
}

export interface ChunkSlice {
  offset: number;
  length: number;
  data: Uint8Array;
}

// Pre-computed 256-entry random 64-bit integer lookup table for Gear Hash
const GEAR_TABLE: Uint32Array = new Uint32Array([
  0x0b8a3e7a, 0x8a9b3e1c, 0x5a1e2f3d, 0x9c4b7a1e, 0x3d2e1f4a, 0x7b8a9c0d, 0x1e2f3a4b, 0x5c6d7e8f,
  0x9a0b1c2d, 0x3e4f5a6b, 0x7c8d9e0f, 0x1a2b3c4d, 0x5e6f7a8b, 0x9c0d1e2f, 0x3a4b5c6d, 0x7e8f9a0b,
  0x2c3d4e5f, 0x6a7b8c9d, 0x0e1f2a3b, 0x4c5d6e7f, 0x8a9b0c1d, 0x2e3f4a5b, 0x6c7d8e9f, 0x0a1b2c3d,
  0x4e5f6a7b, 0x8c9d0e1f, 0x2a3b4c5d, 0x6e7f8a9b, 0x0c1d2e3f, 0x4a5b6c7d, 0x8e9f0a1b, 0x2c3d4e5f,
  0xb1c2d3e4, 0xf5a6b7c8, 0xd9e0f1a2, 0xb3c4d5e6, 0xf7a8b9c0, 0xd1e2f3a4, 0xb5c6d7e8, 0xf9a0b1c2,
  0xd3e4f5a6, 0xb7c8d9e0, 0xf1a2b3c4, 0xd5e6f7a8, 0xb9c0d1e2, 0xf3a4b5c6, 0xd7e8f9a0, 0xbbccdde0,
  0x31415926, 0x53589793, 0x23846264, 0x33832795, 0x02884197, 0x16939937, 0x51058209, 0x74944592,
  0x30781640, 0x62862089, 0x98628034, 0x82534211, 0x70679821, 0x48086513, 0x28230664, 0x70938446,
  0x09550582, 0x23172535, 0x94081284, 0x81117450, 0x28410270, 0x19385211, 0x05559644, 0x62294895,
  0x49303819, 0x64428810, 0x97566593, 0x34461284, 0x75648233, 0x78678316, 0x52712019, 0x09145648,
  0x5cd9cbe8, 0x7ee9a531, 0x7f48e4cf, 0x25d045d6, 0x27ec1e94, 0x4a9b6c07, 0x36a5b98f, 0x0f2a74c2,
  0x84bc2a45, 0x9bcf12de, 0x2389ab45, 0x67ef0123, 0x456789ab, 0xcdef0123, 0x456789ab, 0xcdef0123,
  0x98badcfe, 0xefcdab89, 0x67452301, 0x10325476, 0xc3d2e1f0, 0xf0e1d2c3, 0x8796a5b4, 0x4b5a6978,
  0x11223344, 0x55667788, 0x99aabbcc, 0xddeeff00, 0x01122334, 0x45566778, 0x899aabbc, 0xcdddeeff,
  0xa1b2c3d4, 0xe5f6a7b8, 0xc9d0e1f2, 0xa3b4c5d6, 0xe7f8a9b0, 0xc1d2e3f4, 0xa5b6c7d8, 0xe9f0a1b2,
  0xc3d4e5f6, 0xa7b8c9d0, 0xe1f2a3b4, 0xc5d6e7f8, 0xa9b0c1d2, 0xedfe0112, 0xc7d8e9f0, 0xaabbccdd,
  0x41526374, 0x8596a7b8, 0xc9daebfc, 0x0d1e2f30, 0x41526374, 0x8596a7b8, 0xc9daebfc, 0x0d1e2f30,
  0x718293a4, 0xb5c6d7e8, 0xf90a1b2c, 0x3d4e5f60, 0x718293a4, 0xb5c6d7e8, 0xf90a1b2c, 0x3d4e5f60,
  0x21324354, 0x65768798, 0xa9bacbdc, 0xedfe0f10, 0x21324354, 0x65768798, 0xa9bacbdc, 0xedfe0f10,
  0x51627384, 0x95a6b7c8, 0xd9eafbfc, 0x1d2e3f40, 0x51627384, 0x95a6b7c8, 0xd9eafbfc, 0x1d2e3f40,
  0x8192a3b4, 0xc5c6d7e8, 0x090a1b2c, 0x4d4e5f60, 0x8192a3b4, 0xc5c6d7e8, 0x090a1b2c, 0x4d4e5f60,
  0x31425364, 0x758697a8, 0xb9bafbfc, 0xfd0e1f20, 0x31425364, 0x758697a8, 0xb9bafbfc, 0xfd0e1f20,
  0x61728394, 0xa5a6b7c8, 0xe9eafbfc, 0x2d2e3f40, 0x61728394, 0xa5a6b7c8, 0xe9eafbfc, 0x2d2e3f40,
  0x9192a3b4, 0xd5d6d7e8, 0x191a1b2c, 0x5d5e5f60, 0x9192a3b4, 0xd5d6d7e8, 0x191a1b2c, 0x5d5e5f60,
  0xa1a2a3a4, 0xb1b2b3b4, 0xc1c2c3c4, 0xd1d2d3d4, 0xe1e2e3e4, 0xf1f2f3f4, 0x01020304, 0x11121314,
  0x21222324, 0x31323334, 0x41424344, 0x51525354, 0x61626364, 0x71727374, 0x81828384, 0x91929394,
  0xa5a6a7a8, 0xb5b6b7b8, 0xc5c6c7c8, 0xd5d6d7d8, 0xe5e6e7e8, 0xf5f6f7f8, 0x05060708, 0x15161718,
  0x25262728, 0x35363738, 0x45464748, 0x55565758, 0x65666768, 0x75767778, 0x85868788, 0x95969798,
  0xa9aaabac, 0xb9babbbc, 0xc9cacbcc, 0xd9dadbdc, 0xe9eaebec, 0xf9fafbfc, 0x090a0b0c, 0x191a1b1c,
  0x292a2b2c, 0x393a3b3c, 0x494a4b4c, 0x595a5b5c, 0x696a6b6c, 0x797a7b7c, 0x898a8b8c, 0x999a9b9c,
  0xadaeafb0, 0xbdbecbf0, 0xcddedf00, 0xdddedff0, 0xedeeeff0, 0xfdfefff0, 0x0d0e0f10, 0x1d1e1f20,
  0x2d2e2f30, 0x3d3e3f40, 0x4d4e4f50, 0x5d5e5f60, 0x6d6e6f70, 0x7d7e7f80, 0x8d8e8f90, 0x9d9e9fa0,
]);

export class FastCDC {
  private readonly minSize: number;
  private readonly avgSize: number;
  private readonly maxSize: number;
  private readonly maskS: number;
  private readonly maskL: number;

  constructor(options: FastCDCOptions = {}) {
    this.minSize = options.minSize ?? 512; // 512 Byte min
    this.avgSize = options.avgSize ?? 1024; // 1 KB target avg
    this.maxSize = options.maxSize ?? 4096; // 4 KB max

    // FastCDC dual-mask optimization:
    // Bits for small mask (stricter before target avg) and large mask (easier after target avg)
    const bits = Math.round(Math.log2(this.avgSize));
    this.maskS = (1 << (bits + 1)) - 1; // Strict mask
    this.maskL = (1 << (bits - 1)) - 1; // Relaxed mask
  }

  /**
   * Chunks a buffer or string into dynamic content-defined slices.
   */
  public chunk(input: Uint8Array | ArrayBuffer | string): ChunkSlice[] {
    let buffer: Uint8Array;
    if (typeof input === 'string') {
      buffer = new TextEncoder().encode(input);
    } else if (input instanceof ArrayBuffer) {
      buffer = new Uint8Array(input);
    } else {
      buffer = input;
    }

    const totalLength = buffer.length;
    if (totalLength === 0) {
      return [];
    }

    // Fast path: If buffer is smaller than minimum size, treat as single chunk
    if (totalLength <= this.minSize) {
      return [
        {
          offset: 0,
          length: totalLength,
          data: buffer,
        },
      ];
    }

    const chunks: ChunkSlice[] = [];
    let offset = 0;

    while (offset < totalLength) {
      const remaining = totalLength - offset;

      // Tail chunk if remaining bytes <= minSize
      if (remaining <= this.minSize) {
        chunks.push({
          offset,
          length: remaining,
          data: buffer.subarray(offset, totalLength),
        });
        break;
      }

      // Max slice length we will scan
      const scanLimit = Math.min(remaining, this.maxSize);
      let cutPoint = scanLimit;
      let fingerprint = 0;

      // Scan starting at minSize to avoid sub-minimum chunks
      for (let i = this.minSize; i < scanLimit; i++) {
        const byte = buffer[offset + i];
        fingerprint = ((fingerprint << 1) + GEAR_TABLE[byte]) >>> 0;

        if (i < this.avgSize) {
          // Strict mask before target average size
          if ((fingerprint & this.maskS) === 0) {
            cutPoint = i + 1;
            break;
          }
        } else {
          // Relaxed mask after target average size
          if ((fingerprint & this.maskL) === 0) {
            cutPoint = i + 1;
            break;
          }
        }
      }

      chunks.push({
        offset,
        length: cutPoint,
        data: buffer.subarray(offset, offset + cutPoint),
      });

      offset += cutPoint;
    }

    return chunks;
  }
}
