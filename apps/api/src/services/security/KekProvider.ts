/**
 * KekProvider (Key Encryption Key Provider)
 * 
 * Manages Master Encryption Key (KEK) versions, validation, and SHA-256 derivation.
 * Supports:
 * 1. Legacy v0 key: MASTER_ENCRYPTION_KEY (string >= 30 chars).
 * 2. Multi-version key rotation: MASTER_ENCRYPTION_KEYS (JSON map of { "1": "key1", "2": "key2" }).
 * 3. Auto-detects current active version as the highest numeric version.
 * 4. Derives a deterministic 256-bit key from raw strings via SHA-256 hash.
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

  constructor(env: { MASTER_ENCRYPTION_KEYS?: string; MASTER_ENCRYPTION_KEY?: string }) {
    this.init(env);
  }

  private init(env: { MASTER_ENCRYPTION_KEYS?: string; MASTER_ENCRYPTION_KEY?: string }): void {
    // 1. Parse multi-version key map
    if (env.MASTER_ENCRYPTION_KEYS && env.MASTER_ENCRYPTION_KEYS.trim().length > 0) {
      try {
        const parsed = JSON.parse(env.MASTER_ENCRYPTION_KEYS) as Record<string, string>;
        if (parsed && typeof parsed === 'object') {
          for (const [vStr, keySecret] of Object.entries(parsed)) {
            const v = Number(vStr);
            if (!isNaN(v) && typeof keySecret === 'string' && keySecret.trim().length > 0) {
              const trimmed = keySecret.trim();
              if (trimmed.length < KekProvider.MIN_KEY_LENGTH) {
                throw new Error(
                  `CONFIG_ERROR: MASTER_ENCRYPTION_KEYS version ${v} must be at least ${KekProvider.MIN_KEY_LENGTH} characters long (current: ${trimmed.length}).`
                );
              }
              this.rawSecrets.set(v, trimmed);
            }
          }
        }
      } catch (err: any) {
        if (err.message?.startsWith('CONFIG_ERROR:')) {
          throw err;
        }
        console.warn('Failed to parse MASTER_ENCRYPTION_KEYS JSON map:', err);
      }
    }

    // 2. Register legacy / standalone MASTER_ENCRYPTION_KEY as version 0.
    // Note: MASTER_ENCRYPTION_KEY has higher priority and will overwrite MASTER_ENCRYPTION_KEYS[0] if both exist.
    if (env.MASTER_ENCRYPTION_KEY && env.MASTER_ENCRYPTION_KEY.trim().length > 0) {
      const trimmed = env.MASTER_ENCRYPTION_KEY.trim();
      if (trimmed.length < KekProvider.MIN_KEY_LENGTH) {
        throw new Error(
          `CONFIG_ERROR: MASTER_ENCRYPTION_KEY must be at least ${KekProvider.MIN_KEY_LENGTH} characters long (current: ${trimmed.length}).`
        );
      }
      this.rawSecrets.set(0, trimmed);
    }

    // 3. Determine current version (highest numeric version)
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
        `CONFIG_ERROR: MASTER_ENCRYPTION_KEY for version ${targetVersion} is not configured in Cloudflare environment.`
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
