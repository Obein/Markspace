-- Migration 0003: Add TOTP multi-factor authentication support
ALTER TABLE users ADD COLUMN encrypted_totp_secret TEXT;
ALTER TABLE users ADD COLUMN is_totp_enabled INTEGER NOT NULL DEFAULT 0;
