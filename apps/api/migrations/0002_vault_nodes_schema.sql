-- Migration 0002: Create vault_nodes table for Filesystem File Tree Metadata & Object Storage Architecture

CREATE TABLE IF NOT EXISTS vault_nodes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_path TEXT NOT NULL,
    name TEXT NOT NULL,
    is_directory INTEGER NOT NULL DEFAULT 0,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'text/markdown',
    category TEXT NOT NULL DEFAULT 'markdown',
    encrypted_dek TEXT NOT NULL,
    object_key TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, path)
);

CREATE INDEX IF NOT EXISTS idx_vault_nodes_user_id ON vault_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_nodes_parent_path ON vault_nodes(user_id, parent_path);
CREATE INDEX IF NOT EXISTS idx_vault_nodes_path ON vault_nodes(user_id, path);
