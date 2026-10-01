-- Spatial Walkthrough chapters (spaces) + multi-clip edges.
-- Additive. Chapters are logical time ranges on a source clip — never copied video.
-- Deleting a chapter MUST NOT delete clips, masters, or project files.

CREATE TABLE IF NOT EXISTS public.spatial_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  name text NOT NULL,
  building text,
  floor text,
  zone text,
  chapter_type text NOT NULL DEFAULT 'other'
    CHECK (chapter_type IN (
      'floor','room','zone','lobby','mechanical','stairs','corridor','exterior','aerial','other'
    )),
  start_time double precision NOT NULL,
  end_time double precision NOT NULL,
  default_yaw double precision NOT NULL DEFAULT 0,
  default_pitch double precision NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  thumbnail_key text,
  visibility text NOT NULL DEFAULT 'client'
    CHECK (visibility IN ('internal','client','public')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_chapters_time_chk CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_sw_chapters_wt ON public.spatial_chapters(walkthrough_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sw_chapters_clip ON public.spatial_chapters(clip_id, start_time);

CREATE TABLE IF NOT EXISTS public.spatial_clip_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  source_clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  dest_clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  source_endpoint text NOT NULL DEFAULT 'end'
    CHECK (source_endpoint IN ('start','end')),
  dest_endpoint text NOT NULL DEFAULT 'start'
    CHECK (dest_endpoint IN ('start','end')),
  default_yaw double precision NOT NULL DEFAULT 0,
  default_pitch double precision NOT NULL DEFAULT 0,
  transition_type text NOT NULL DEFAULT 'manual'
    CHECK (transition_type IN ('door','stairs','exterior','aerial','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_clip_edges_distinct_chk CHECK (source_clip_id <> dest_clip_id),
  CONSTRAINT spatial_clip_edges_unique UNIQUE (source_clip_id, source_endpoint)
);
CREATE INDEX IF NOT EXISTS idx_sw_edges_wt ON public.spatial_clip_edges(walkthrough_id);

ALTER TABLE public.spatial_share_tokens
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.spatial_chapters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sw_share_chapter ON public.spatial_share_tokens(chapter_id);

DO $$ BEGIN
  CREATE TRIGGER trg_spatial_chapters_updated_at
    BEFORE UPDATE ON public.spatial_chapters
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.spatial_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_clip_edges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sw_chapters_org_all ON public.spatial_chapters FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_chapters.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_chapters.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_edges_org_all ON public.spatial_clip_edges FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_clip_edges.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_clip_edges.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
