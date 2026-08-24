-- 0009_active_sessions_and_remember_me.sql
-- Multi-session tracking, device metadata, and custom expiration policies (1 day default vs 7 days remember me)

ALTER TABLE token_families ADD COLUMN ip_address TEXT;
ALTER TABLE token_families ADD COLUMN user_agent TEXT;
ALTER TABLE token_families ADD COLUMN device_name TEXT;
ALTER TABLE token_families ADD COLUMN ttl_seconds INTEGER NOT NULL DEFAULT 86400;
ALTER TABLE token_families ADD COLUMN is_remember_me INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_families ADD COLUMN last_active_at INTEGER;
