-- Migration 0004: Create vault_security table for server-assisted online unlock ticket protocol
CREATE TABLE IF NOT EXISTS vault_security (
    vault_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    server_salt TEXT NOT NULL,
    fail_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vault_security_user_id ON vault_security(user_id);
