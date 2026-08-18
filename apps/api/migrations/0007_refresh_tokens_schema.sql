-- 0007_refresh_tokens_schema.sql
-- Zero-Trust Dual-Token Model: Token Families & Refresh Token Rotation (RTR) Storage

CREATE TABLE IF NOT EXISTS token_families (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    active_generation INTEGER NOT NULL DEFAULT 0,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_reason TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    generation INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    dpop_jkt TEXT,
    expires_at INTEGER NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_token_families_user ON token_families(user_id);
