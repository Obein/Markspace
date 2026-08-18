-- 0008 User Policy, Storage Quotas, and System Configuration Schema
ALTER TABLE users ADD COLUMN last_active_at INTEGER;
ALTER TABLE users ADD COLUMN storage_quota_bytes INTEGER;

-- Initialize last_active_at with created_at for existing users
UPDATE users SET last_active_at = created_at WHERE last_active_at IS NULL;

-- System Configuration Table for Global Quotas and Idle Lifecycle Policies
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Insert Default System Policies
INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES ('default_storage_quota_bytes', '10485760', 1700000000000); -- 10MB default
INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES ('idle_destruction_period_ms', '2592000000', 1700000000000); -- 30 days (1 month) default
INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES ('max_audit_logs_per_user', '100', 1700000000000);

-- Index for searching idle users efficiently
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
