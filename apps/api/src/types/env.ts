/**
 * Cloudflare Worker Environment Bindings.
 */
export interface Env {
  /** Cloudflare D1 Database binding */
  DB: D1Database;
  /** Cloudflare R2 Bucket binding (optional when using third-party storage) */
  BUCKET?: R2Bucket;
  /** Cloudflare Worker Static Assets binding */
  ASSETS?: Fetcher;
  /** JWT Secret Key for signing and verifying tokens */
  JWT_SECRET: string;
  /** Master Key Encryption Key (KEK) legacy single key (v0) */
  MASTER_ENCRYPTION_KEY?: string;
  /** Multi-version Master Key Encryption Keys map (JSON format: { "1": "key1", "2": "key2" }) */
  MASTER_ENCRYPTION_KEYS?: string;
  /** Environment indicator (development, production) */
  ENVIRONMENT?: string;
}
