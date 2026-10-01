-- Spatial Walkthrough (service-first). Additive. Does not alter Tour Builder tables.
-- Enable per org: UPDATE org_feature_flags SET standalone_spatial_walkthrough = true WHERE org_id = '...';

ALTER TABLE public.org_feature_flags
  ADD COLUMN IF NOT EXISTS standalone_spatial_walkthrough boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.spatial_walkthroughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  building text,
  floor text,
  zone text,
  walkthrough_type text NOT NULL DEFAULT 'interior'
    CHECK (walkthrough_type IN ('interior', 'exterior', 'aerial', 'mixed')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'ready', 'failed', 'published')),
  processing_error text,
  duration_s double precision,
  operator_patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand_theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_policy text NOT NULL DEFAULT 'client'
    CHECK (default_policy IN ('client', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_org_project ON public.spatial_walkthroughs(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_sw_captured ON public.spatial_walkthroughs(project_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.spatial_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  title text,
  zone text,
  master_key text NOT NULL,
  master_sha256 text,
  master_bytes bigint,
  proxy_key text,
  poster_key text,
  manifest_key text,
  duration_s double precision,
  width integer,
  height integer,
  fps double precision,
  status text NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  processing_error text,
  default_yaw double precision DEFAULT 0,
  default_pitch double precision DEFAULT 0,
  upload_session jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_clips_wt ON public.spatial_clips(walkthrough_id, sort_order);

CREATE TABLE IF NOT EXISTS public.spatial_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'ingest',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  stage text,
  progress_pct integer NOT NULL DEFAULT 0,
  source_s3_key text,
  worker_run_id text,
  error_log text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_jobs_clip ON public.spatial_processing_jobs(clip_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.spatial_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  t_seconds double precision NOT NULL,
  label text,
  zone text,
  yaw_deg double precision NOT NULL DEFAULT 0,
  pitch_deg double precision NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  thumbnail_key text,
  xyz jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_wp_clip ON public.spatial_waypoints(clip_id, sort_order);

CREATE TABLE IF NOT EXISTS public.spatial_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  walkthrough_id uuid REFERENCES public.spatial_walkthroughs(id) ON DELETE SET NULL,
  clip_id uuid REFERENCES public.spatial_clips(id) ON DELETE SET NULL,
  pin_series_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text NOT NULL,
  pin_type text NOT NULL DEFAULT 'document'
    CHECK (pin_type IN ('document','rfi','drawing','submittal','photo','issue','note','url','other')),
  body text,
  t_seconds double precision,
  yaw_deg double precision,
  pitch_deg double precision,
  xyz jsonb,
  visibility text NOT NULL DEFAULT 'client'
    CHECK (visibility IN ('internal','client','public')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_pins_project ON public.spatial_pins(project_id);
CREATE INDEX IF NOT EXISTS idx_sw_pins_wt ON public.spatial_pins(walkthrough_id);
CREATE INDEX IF NOT EXISTS idx_sw_pins_series ON public.spatial_pins(pin_series_id);

CREATE TABLE IF NOT EXISTS public.spatial_pin_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pin_id uuid NOT NULL REFERENCES public.spatial_pins(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('slatedrop','url')),
  slatedrop_id uuid REFERENCES public.slatedrop_uploads(id) ON DELETE CASCADE,
  external_url text,
  title text,
  visible_on_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_pin_attachments_payload_chk CHECK (
    (kind = 'slatedrop' AND slatedrop_id IS NOT NULL) OR
    (kind = 'url' AND external_url IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_sw_pin_att_pin ON public.spatial_pin_attachments(pin_id);

CREATE TABLE IF NOT EXISTS public.spatial_redactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  t_start double precision NOT NULL,
  t_end double precision NOT NULL,
  yaw_min double precision,
  yaw_max double precision,
  pitch_min double precision,
  pitch_max double precision,
  mode text NOT NULL
    CHECK (mode IN ('skip','solid','operator-patch','blur')),
  policy text NOT NULL
    CHECK (policy IN ('client','public')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_redactions_time_chk CHECK (t_end > t_start)
);
CREATE INDEX IF NOT EXISTS idx_sw_redact_clip ON public.spatial_redactions(clip_id, policy);

CREATE TABLE IF NOT EXISTS public.spatial_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  policy text NOT NULL CHECK (policy IN ('client','public')),
  label text,
  password_hash text,
  expires_at timestamptz,
  max_views integer CHECK (max_views IS NULL OR max_views > 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  allow_download boolean NOT NULL DEFAULT false,
  allow_reshare boolean NOT NULL DEFAULT false,
  is_revoked boolean NOT NULL DEFAULT false,
  branding_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_share_token ON public.spatial_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sw_share_wt ON public.spatial_share_tokens(walkthrough_id);

CREATE TABLE IF NOT EXISTS public.spatial_org_themes (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_key text,
  logo_display_key text,
  primary_color text,
  secondary_color text,
  accent_color text,
  page_bg_color text,
  surface_color text,
  text_color text,
  muted_text_color text,
  logo_treatment text NOT NULL DEFAULT 'auto'
    CHECK (logo_treatment IN ('light','dark','auto')),
  show_powered_by boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_spatial_walkthroughs_updated_at
    BEFORE UPDATE ON public.spatial_walkthroughs
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.spatial_walkthroughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_pin_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_redactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_org_themes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sw_org_all ON public.spatial_walkthroughs FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_walkthroughs.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_walkthroughs.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_clips_org_all ON public.spatial_clips FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_clips.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_clips.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_jobs_org_all ON public.spatial_processing_jobs FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_processing_jobs.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_processing_jobs.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_wp_org_all ON public.spatial_waypoints FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_waypoints.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_waypoints.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_pins_org_all ON public.spatial_pins FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_pins.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_pins.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_att_org_all ON public.spatial_pin_attachments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_pin_attachments.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_pin_attachments.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_redact_org_all ON public.spatial_redactions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_redactions.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_redactions.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_share_org_all ON public.spatial_share_tokens FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_share_tokens.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_share_tokens.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sw_theme_org_all ON public.spatial_org_themes FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_org_themes.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_org_themes.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON TABLE public.spatial_share_tokens FROM anon;
REVOKE ALL ON TABLE public.spatial_clips FROM anon;
REVOKE ALL ON TABLE public.spatial_processing_jobs FROM anon;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.spatial_processing_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.spatial_clips;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
