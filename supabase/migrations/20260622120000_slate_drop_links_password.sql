-- Add optional password protection to SlateDrop share links.
-- Idempotent: safe to re-run. NULL password_hash = no password (default).
ALTER TABLE slate_drop_links
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
