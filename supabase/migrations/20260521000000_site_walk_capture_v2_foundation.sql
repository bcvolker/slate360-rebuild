-- Migration: 20260521000000_site_walk_capture_v2_foundation.sql
-- Site Walk Capture V2 — Phase 1 additive foundation (sessions, items, deliverables).

-- Sessions: V2 tracking + offline/error metadata
ALTER TABLE public.site_walk_sessions
  ADD COLUMN IF NOT EXISTS capture_v2_version TEXT DEFAULT '2.0',
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS created_offline_at TIMESTAMPTZ;

-- Items: sync resilience + soft-delete support
ALTER TABLE public.site_walk_items
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_site_walk_items_v2_active
  ON public.site_walk_items (session_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_walk_items_v2_project_active
  ON public.site_walk_items (project_id, created_at DESC)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

-- Deliverables: optional async export tracking (honest job state; defaults preserve legacy rows)
ALTER TABLE public.site_walk_deliverables
  ADD COLUMN IF NOT EXISTS async_job_progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS async_job_status TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS async_error_log TEXT;

DO $$
BEGIN
  ALTER TABLE public.site_walk_deliverables
    DROP CONSTRAINT IF EXISTS sw_deliverables_async_job_progress_check;
  ALTER TABLE public.site_walk_deliverables
    ADD CONSTRAINT sw_deliverables_async_job_progress_check
    CHECK (async_job_progress >= 0 AND async_job_progress <= 100);

  ALTER TABLE public.site_walk_deliverables
    DROP CONSTRAINT IF EXISTS sw_deliverables_async_job_status_check;
  ALTER TABLE public.site_walk_deliverables
    ADD CONSTRAINT sw_deliverables_async_job_status_check
    CHECK (async_job_status IN ('queued', 'processing', 'complete', 'failed', 'cancelled'));
END $$;

COMMENT ON COLUMN public.site_walk_items.deleted_at IS
  'Soft-delete timestamp; active capture reads must filter deleted_at IS NULL.';
COMMENT ON COLUMN public.site_walk_deliverables.async_job_status IS
  'Export pipeline state for Capture V2 deliverable generation.';
