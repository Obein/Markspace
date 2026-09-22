-- Migration 0013: Add kek_version to vault_security table for KEK rotation
ALTER TABLE vault_security ADD COLUMN kek_version INTEGER NOT NULL DEFAULT 0;
