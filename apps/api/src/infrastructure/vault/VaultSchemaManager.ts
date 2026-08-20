import { D1Database } from '@cloudflare/workers-types';

/**
 * VaultSchemaManager
 * Handles asynchronous, idempotent schema migrations and table initialization in Cloudflare D1.
 */
export class VaultSchemaManager {
  private static schemaInitPromises = new WeakMap<D1Database, Promise<void>>();

  /**
   * Ensures all required D1 tables and indices for Vault nodes, legacy versions,
   * CAS chunks, and Merkle manifests exist.
   *
   * @param db - Cloudflare D1 database instance
   */
  public static async ensureSchema(db: D1Database): Promise<void> {
    let initPromise = this.schemaInitPromises.get(db);
    if (!initPromise) {
      initPromise = (async () => {
        // 1. Ensure Legacy Versions Table
        await db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_node_versions (
              id TEXT PRIMARY KEY,
              node_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              commit_hash TEXT NOT NULL,
              size INTEGER NOT NULL,
              encrypted_dek TEXT NOT NULL,
              object_key TEXT NOT NULL,
              commit_message TEXT,
              created_at INTEGER NOT NULL
            )`
          )
          .run();

        await db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_versions_node_ts ON vault_node_versions(user_id, node_id, timestamp DESC)`
          )
          .run();

        // 2. Ensure CAS Chunks Table
        await db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_chunks (
              id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              size INTEGER NOT NULL,
              created_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, id)
            )`
          )
          .run();

        await db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_vault_chunks_user ON vault_chunks(user_id)`
          )
          .run();

        // 3. Ensure Merkle Manifests Table
        await db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_manifests (
              id TEXT NOT NULL,
              node_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              parent_manifest_id TEXT,
              plain_size INTEGER NOT NULL,
              cipher_size INTEGER NOT NULL,
              commit_message TEXT,
              created_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, id)
            )`
          )
          .run();

        await db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_vault_manifests_node_ts ON vault_manifests(user_id, node_id, created_at DESC)`
          )
          .run();

        // 4. Ensure active_manifest_id column on vault_nodes
        try {
          await db
            .prepare(`ALTER TABLE vault_nodes ADD COLUMN active_manifest_id TEXT`)
            .run();
        } catch {
          // Column already exists in SQLite/D1 - safe to ignore
        }
      })();

      this.schemaInitPromises.set(db, initPromise);
    }

    return initPromise;
  }
}
