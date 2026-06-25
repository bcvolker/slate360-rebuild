-- ============================================================================
-- 360 Tour Builder — P0 foundation
-- Adds: per-scene processing status + camera settings + keep-out view limits,
--       tour_scene_derivatives (never-mutate-original model),
--       tour_processing_jobs (status surface for Modal ingest).
-- Idempotent. See docs/design/TOUR_BUILDER_PLAN.md.
-- ============================================================================

-- ── tour_scenes: status, camera settings, view limits, classification, geo ──
ALTER TABLE public.tour_scenes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS processing_error text,
  -- Camera: open view + zoom (FOV in degrees). initial_yaw/pitch already exist.
  ADD COLUMN IF NOT EXISTS initial_fov float,
  ADD COLUMN IF NOT EXISTS min_fov float,
  ADD COLUMN IF NOT EXISTS max_fov float,
  ADD COLUMN IF NOT EXISTS default_zoom float,
  ADD COLUMN IF NOT EXISTS autorotate boolean NOT NULL DEFAULT false,
  -- Keep-out / restricted regions: { yawMin,yawMax,pitchMin,pitchMax } and/or cones.
  ADD COLUMN IF NOT EXISTS view_limits jsonb,
  -- Classification for floorplan vs map minimap.
  ADD COLUMN IF NOT EXISTS scene_kind text NOT NULL DEFAULT 'generic'
    CHECK (scene_kind IN ('generic', 'aerial_geo', 'interior_plan')),
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision,
  ADD COLUMN IF NOT EXISTS altitude_ft double precision,
  -- Path to the PSV equirectangular-tiles-adapter manifest (set by Modal ingest).
  ADD COLUMN IF NOT EXISTS multires_manifest_path text;

-- ── tour_scene_derivatives: every processed output; original is never mutated ─
CREATE TABLE IF NOT EXISTS public.tour_scene_derivatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.tour_scenes(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  derivative_type text NOT NULL CHECK (derivative_type IN (
    'original', 'normalized', 'thumbnail', 'tiles_manifest',
    'branded_nadir', 'mls_clean', 'enhanced', 'video_poster'
  )),
  storage_key text NOT NULL,
  width int,
  height int,
  format text,
  brand_id uuid,
  tiles_manifest_key text,
  profile_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tour_derivatives_scene
  ON public.tour_scene_derivatives(scene_id, derivative_type);
CREATE INDEX IF NOT EXISTS idx_tour_derivatives_tour
  ON public.tour_scene_derivatives(tour_id);

-- ── tour_processing_jobs: status surface for the Modal ingest pipeline ────────
CREATE TABLE IF NOT EXISTS public.tour_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.tour_scenes(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'ingest'
    CHECK (job_type IN ('ingest', 'nadir', 'enhance', 'tiles')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  stage text,
  progress_pct int NOT NULL DEFAULT 0,
  source_s3_key text,
  worker_run_id text,
  error_log text,
  retryable boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tour_jobs_tour_time
  ON public.tour_processing_jobs(tour_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_jobs_scene
  ON public.tour_processing_jobs(scene_id);

-- ── RLS (cascade from project_tours via org membership, same as tour_scenes) ──
ALTER TABLE public.tour_scene_derivatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_processing_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members view tour derivatives" ON public.tour_scene_derivatives
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scene_derivatives.tour_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "org members edit tour derivatives" ON public.tour_scene_derivatives
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scene_derivatives.tour_id AND om.user_id = auth.uid()
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scene_derivatives.tour_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "org members view tour jobs" ON public.tour_processing_jobs
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_processing_jobs.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "org members edit tour jobs" ON public.tour_processing_jobs
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_processing_jobs.org_id AND om.user_id = auth.uid()
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_processing_jobs.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger for jobs (reuse the shared bump function used by tours).
DO $$ BEGIN
  CREATE TRIGGER trg_tour_processing_jobs_updated_at
    BEFORE UPDATE ON public.tour_processing_jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Realtime: surface scene status + job progress to the workspace ───────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_processing_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_scenes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
