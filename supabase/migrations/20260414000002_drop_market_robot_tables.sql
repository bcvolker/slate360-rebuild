-- ============================================================
-- Drop Market Robot tables — Phase 1 surface cleanup
-- ============================================================
--
-- Context: All Market Robot code was deleted from the codebase
-- in commit 49c0500 (2026-04-14). These tables are orphaned
-- with zero active readers/writers. Every table uses only
-- auth.users(id) FKs — no cross-table dependencies.
--
-- Safety: NO CASCADE used. Each DROP will fail cleanly if an
-- unexpected FK exists, surfacing the dependency instead of
-- silently destroying data.
--
-- Review: Run this migration only after verifying no external
-- service (cron, webhook, admin script) still writes to these.
-- ============================================================

-- 1. Drop trigger + function first (depends on market_plans)
DROP TRIGGER IF EXISTS trg_market_plans_updated_at ON market_plans;
DROP FUNCTION IF EXISTS set_market_plans_updated_at();

-- 2. Drop tables (no CASCADE — will surface FK violations if any)
DROP TABLE IF EXISTS market_activity_log;
DROP TABLE IF EXISTS market_scheduler_lock;
DROP TABLE IF EXISTS market_watchlist;
DROP TABLE IF EXISTS market_tab_prefs;
DROP TABLE IF EXISTS market_bot_runtime_state;
DROP TABLE IF EXISTS market_bot_runtime;
DROP TABLE IF EXISTS market_plans;
DROP TABLE IF EXISTS market_directives;
DROP TABLE IF EXISTS market_trades;

-- 3. Drop legacy backup tables (renamed by 20260224000000)
DROP TABLE IF EXISTS market_bot_settings__legacy_backup;
DROP TABLE IF EXISTS market_bot_state__legacy_backup;

-- 4. Clean up slate360_staff.access_scope default (if table exists)
-- The default was changed to '{market}' but market no longer exists.
-- Set default to empty array; existing rows with 'market' in
-- access_scope are harmless (code no longer reads the column).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slate360_staff') THEN
    ALTER TABLE slate360_staff ALTER COLUMN access_scope SET DEFAULT '{}';
  END IF;
END $$;
