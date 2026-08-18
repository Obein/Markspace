-- Migration 0006: Add active_manifest_id to vault_nodes table
ALTER TABLE vault_nodes ADD COLUMN active_manifest_id TEXT;
