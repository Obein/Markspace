-- Migration 0010: Create user_storage_configs table for encrypted third-party storage metadata
CREATE TABLE IF NOT EXISTS user_storage_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vault_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_config TEXT NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, vault_id)
);

CREATE INDEX IF NOT EXISTS idx_user_storage_configs_user_vault ON user_storage_configs(user_id, vault_id);
