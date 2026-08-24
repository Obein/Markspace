-- Markspace Cloudflare D1 Database Schema Initialization

-- Users Table: Store account registration credentials, security salts, and RBAC roles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    auth_token_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    encrypted_totp_secret TEXT,
    is_totp_enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Vault Nodes Table: Filesystem File Tree Metadata (SQL Stores Hierarchy & Metadata Only)
-- File contents (Markdown notes, media, and binary files) are saved in R2 Object Storage.
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

-- Notes Table (Legacy compatibility)
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    encrypted_title TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    encrypted_dek TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Media Table (Legacy compatibility)
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    note_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    encrypted_dek TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vault Security Table: Server-Assisted Online Unlock Ticket & Anti-Brute-Force Lockout Registry
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

-- Zero-Trust Dual-Token Model: Token Families & Refresh Token Rotation (RTR) Storage
CREATE TABLE IF NOT EXISTS token_families (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    active_generation INTEGER NOT NULL DEFAULT 0,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    ttl_seconds INTEGER NOT NULL DEFAULT 86400,
    is_remember_me INTEGER NOT NULL DEFAULT 0,
    last_active_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    generation INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    dpop_jkt TEXT,
    expires_at INTEGER NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (family_id) REFERENCES token_families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_token_families_user ON token_families(user_id);
