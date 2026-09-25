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
  /** Optional comma-separated list of allowed cross-origin domains */
  ALLOWED_ORIGINS?: string;
  /** Dynamic versioned Master Encryption Keys: MEK_v1, MEK_v2, ... */
  [key: `MEK_v${number}`]: string | undefined;
  /** Environment indicator (development, production) */
  ENVIRONMENT?: string;
  /** Allow indexing arbitrary worker bindings / secrets */
  [key: string]: any;
}
