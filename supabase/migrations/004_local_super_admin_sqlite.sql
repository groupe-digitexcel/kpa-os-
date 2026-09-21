-- KPA-OS — Local SQLite Super Admin compatibility note
-- This migration is intentionally documentation-only for Supabase.
-- Local SQLite schema migration is implemented in lib/db/local.ts because
-- SQLite role CHECK constraints cannot be altered with ALTER TABLE.
-- Existing desktop databases are rebuilt there while preserving staff data.

-- No Supabase SQL is required in this file.
