-- ============================================================================
-- 360 Tour Builder — mobile import multipart upload sessions
-- Mirrors digital_twin_multipart_uploads' session-tracking shape (see
-- app/api/digital-twin/upload/{init,sign-parts,complete,abort}/route.ts) so the
-- mobile /app/tours import flow gets resumable, chunked uploads over cellular.
-- The scene row itself is only created at /complete (matching the existing
-- desktop single-shot flow: upload -> complete), so this session table doesn't
-- reference tour_scenes at all — only tour_id + the storage key/filename it
-- will need to create that row once the multipart upload finishes.
-- Idempotent. See docs/design/TOUR_BUILDER_PLAN.md §8.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tour_scene_multipart_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  s3_upload_id text NOT NULL,
  content_type text NOT NULL,
  filename text NOT NULL,
  size_bytes bigint NOT NULL,
  total_parts int NOT NULL,
  part_size_bytes bigint NOT NULL,
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'uploading', 'completed', 'aborted')),
  completed_parts int NOT NULL DEFAULT 0,
  error_text text,
  expires_at timestamptz,
  completed_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_multipart_tour
  ON public.tour_scene_multipart_uploads(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_multipart_org
  ON public.tour_scene_multipart_uploads(org_id);

ALTER TABLE public.tour_scene_multipart_uploads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members view tour multipart uploads" ON public.tour_scene_multipart_uploads
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_scene_multipart_uploads.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "org members edit tour multipart uploads" ON public.tour_scene_multipart_uploads
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_scene_multipart_uploads.org_id AND om.user_id = auth.uid()
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_scene_multipart_uploads.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tour_scene_multipart_uploads_updated_at
    BEFORE UPDATE ON public.tour_scene_multipart_uploads
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
