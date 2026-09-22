-- Migration 0012: Passkey-only Authentication, User Master Key (UMK) Envelopes and Multi-Vault Cloud Storage

-- 1. WebAuthn Passkey Credentials Table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    device_name TEXT,
    aaguid TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);

-- 2. WebAuthn Ephemeral Challenges Table for Replay Prevention
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    challenge TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- 3. User Master Key (UMK) Envelopes Table
CREATE TABLE IF NOT EXISTS user_crypto_keys (
    user_id TEXT PRIMARY KEY,
    wrapped_umk_by_prf TEXT,
    wrapped_umk_by_recovery TEXT NOT NULL,
    recovery_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Vaults Registry Table (Replaces client-side LocalStorage)
CREATE TABLE IF NOT EXISTS user_vaults (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    salt TEXT NOT NULL,
    wrapped_vmk TEXT NOT NULL,
    encrypted_storage_config TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_vaults_user_id ON user_vaults(user_id);
