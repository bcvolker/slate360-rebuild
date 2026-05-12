-- RLS SELECT policies for site_walk_plan_sheets and plan_raster_jobs
-- Required for Supabase Realtime subscriptions to work.
-- Realtime silently drops payloads if the subscribing user's row-level security
-- policy does not allow SELECT on the matching rows.

-- ── site_walk_plan_sheets ─────────────────────────────────────────────────────

-- Enable RLS if not already enabled
ALTER TABLE public.site_walk_plan_sheets ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy (idempotent)
DROP POLICY IF EXISTS "site_walk_plan_sheets_select_org" ON public.site_walk_plan_sheets;

CREATE POLICY "site_walk_plan_sheets_select_org"
  ON public.site_walk_plan_sheets
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- ── plan_raster_jobs ──────────────────────────────────────────────────────────

ALTER TABLE public.plan_raster_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_raster_jobs_select_org" ON public.plan_raster_jobs;

CREATE POLICY "plan_raster_jobs_select_org"
  ON public.plan_raster_jobs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- ── Ensure both tables are in the Realtime publication ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'site_walk_plan_sheets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_plan_sheets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_raster_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_raster_jobs;
  END IF;
END $$;
