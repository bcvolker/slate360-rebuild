-- Directed Tour PR-C1: repeatable routes, stable checkpoints and per-visit marks (additive only).
-- Route position, media time and visit date stay separate: checkpoints order the route,
-- each visit's mark says where its own recording shows that checkpoint, and the visit date
-- is spatial_walkthroughs.captured_at. See docs/design/DIRECTED_TOUR_BUILD_PLAN.md §4.

CREATE TABLE IF NOT EXISTS public.spatial_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- Bumped on material route changes; checkpoints record the revision they joined in.
  revision integer NOT NULL DEFAULT 1,
  -- Capture card header: camera heights, forward direction, general instructions.
  capture_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sr_project ON public.spatial_routes(project_id);

CREATE TABLE IF NOT EXISTS public.spatial_route_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.spatial_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  -- Never deleted: retired chapters keep old links resolvable.
  retired_at timestamptz,
  replaced_by uuid REFERENCES public.spatial_route_chapters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_src_route ON public.spatial_route_chapters(route_id, sort_order);

CREATE TABLE IF NOT EXISTS public.spatial_route_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.spatial_routes(id) ON DELETE CASCADE,
  route_chapter_id uuid NOT NULL REFERENCES public.spatial_route_chapters(id) ON DELETE CASCADE,
  label text NOT NULL,
  -- Capture card line, e.g. "Face the east wall; close-up of the sleeve".
  capture_note text,
  sort_order integer NOT NULL DEFAULT 0,
  introduced_in_revision integer NOT NULL DEFAULT 1,
  retired_at timestamptz,
  replaced_by uuid REFERENCES public.spatial_route_checkpoints(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_srcp_route ON public.spatial_route_checkpoints(route_id, sort_order);

CREATE TABLE IF NOT EXISTS public.spatial_checkpoint_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES public.spatial_route_checkpoints(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES public.spatial_clips(id) ON DELETE SET NULL,
  -- Time on the clip's PUBLIC (operator-free) proxy, the timeline clients play.
  t_seconds double precision,
  yaw_deg double precision NOT NULL DEFAULT 0,
  pitch_deg double precision NOT NULL DEFAULT 0,
  match text NOT NULL CHECK (match IN ('matched','same_chapter','not_captured')),
  still_key text,
  still_status text NOT NULL DEFAULT 'none' CHECK (still_status IN ('none','queued','ready','failed')),
  still_error text,
  set_by uuid,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkpoint_id, walkthrough_id),
  CHECK (match = 'not_captured' OR (clip_id IS NOT NULL AND t_seconds IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_scm_walk ON public.spatial_checkpoint_marks(walkthrough_id);

-- A visit is a walkthrough on a route. Tour publishing is deliberate and separate from
-- `status`, which becomes 'published' as soon as any share link is minted.
ALTER TABLE public.spatial_walkthroughs
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES public.spatial_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS route_revision integer,
  ADD COLUMN IF NOT EXISTS client_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS stills_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_reviewed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_sw_route ON public.spatial_walkthroughs(route_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['spatial_routes','spatial_route_chapters','spatial_route_checkpoints','spatial_checkpoint_marks'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
           USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = %I.org_id AND om.user_id = auth.uid()))
           WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = %I.org_id AND om.user_id = auth.uid()))',
        t || '_org_all', t, t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
  END LOOP;
END $$;
