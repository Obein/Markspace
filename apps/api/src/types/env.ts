/**
 * Cloudflare Worker Environment Bindings.
 */
export interface Env {
  /** Cloudflare D1 Database binding */
  DB: D1Database;
  /** Cloudflare R2 Bucket binding */
  BUCKET: R2Bucket;
  /** Cloudflare Worker Static Assets binding */
  ASSETS?: Fetcher;
  /** JWT Secret Key for signing and verifying tokens */
  JWT_SECRET: string;
  /** Environment indicator (development, production) */
  ENVIRONMENT?: string;
}
