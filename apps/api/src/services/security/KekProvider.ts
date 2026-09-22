/**
 * KekProvider (Key Encryption Key Provider)
 * 
 * Manages Master Encryption Key (KEK) versions, validation, and SHA-256 derivation.
 * Supports:
 * 1. Versioned environment secrets: MEK_v1, MEK_v2, MEK_v3... (string >= 30 chars).
 * 2. Auto-detects current active version as the highest numeric version.
 * 3. Derives a deterministic 256-bit key from raw strings via SHA-256 hash.
 */

export interface DerivedKek {
  version: number;
  rawKey: Uint8Array;
  base64Key: string;
}

export class KekProvider {
  private static readonly MIN_KEY_LENGTH = 30;
  private readonly rawSecrets = new Map<number, string>();
  private readonly keyCache = new Map<number, DerivedKek>();
  private currentVersion: number = 0;
  private configured: boolean = false;

  constructor(env: Record<string, any>) {
    this.init(env);
  }

  private init(env: Record<string, any>): void {
    // Scan all versioned environment secrets: MEK_v1, MEK_v2, MEK_v3, ...
    for (const [key, value] of Object.entries(env)) {
      const match = key.match(/^MEK_v(\d+)$/i);
      if (match && typeof value === 'string' && value.trim().length > 0) {
        const v = parseInt(match[1], 10);
        const trimmed = value.trim();
        if (trimmed.length < KekProvider.MIN_KEY_LENGTH) {
          throw new Error(
            `CONFIG_ERROR: ${key} must be at least ${KekProvider.MIN_KEY_LENGTH} characters long (current: ${trimmed.length}).`
          );
        }
        this.rawSecrets.set(v, trimmed);
      }
    }

    // Determine current version (highest numeric version)
    if (this.rawSecrets.size > 0) {
      const versions = Array.from(this.rawSecrets.keys());
      this.currentVersion = Math.max(...versions);
      this.configured = true;
    }
  }

  /**
   * Derives a deterministic 256-bit key from the raw secret using SHA-256.
   */
  private async derive(version: number, secret: string): Promise<DerivedKek> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    const rawKey = new Uint8Array(hashBuffer);
    const base64Key = btoa(String.fromCharCode(...rawKey));

    return {
      version,
      rawKey,
      base64Key,
    };
  }

  /**
   * Returns whether at least one valid KEK is configured.
   */
  public isConfigured(): boolean {
    return this.configured && this.rawSecrets.size > 0;
  }

  /**
   * Returns the current active version number.
   */
  public getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Retrieves the current active KEK (highest version).
   */
  public async getCurrentKey(): Promise<DerivedKek> {
    return this.getKey(this.currentVersion);
  }

  /**
   * Retrieves a specific version of the KEK.
   * If version is not specified, defaults to currentVersion.
   */
  public async getKey(version?: number): Promise<DerivedKek> {
    const targetVersion = version !== undefined ? version : this.currentVersion;
    
    if (this.keyCache.has(targetVersion)) {
      return this.keyCache.get(targetVersion)!;
    }

    const secret = this.rawSecrets.get(targetVersion);
    if (!secret) {
      throw new Error(
        `CONFIG_ERROR: MEK_v${targetVersion} is not configured in Cloudflare environment.`
      );
    }

    const derived = await this.derive(targetVersion, secret);
    this.keyCache.set(targetVersion, derived);
    return derived;
  }

  /**
   * Lists all available KEK versions.
   */
  public getAvailableVersions(): number[] {
    return Array.from(this.rawSecrets.keys()).sort((a, b) => a - b);
  }
}
