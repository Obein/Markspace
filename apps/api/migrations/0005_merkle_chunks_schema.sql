-- Migration 0005: Content-Addressed Chunks (CAS) & Merkle DAG Manifests

CREATE TABLE IF NOT EXISTS vault_chunks (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_vault_chunks_user ON vault_chunks(user_id);

CREATE TABLE IF NOT EXISTS vault_manifests (
    id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    parent_manifest_id TEXT,
    plain_size INTEGER NOT NULL,
    cipher_size INTEGER NOT NULL,
    commit_message TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_vault_manifests_node_ts ON vault_manifests(user_id, node_id, created_at DESC);
