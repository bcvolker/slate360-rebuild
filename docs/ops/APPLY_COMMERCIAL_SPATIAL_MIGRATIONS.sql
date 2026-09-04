-- Slate360 commercial spatial schema. Additive. Safe to re-run.
-- Skip original DROP CONSTRAINT on spatial_audio_assets_kind_check.

CREATE TABLE IF NOT EXISTS public.spatial_audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('narration','voice_note','item_comment')),
  storage_key text NOT NULL,
  mime text,
  bytes bigint,
  duration_s double precision,
  trim_start_s double precision NOT NULL DEFAULT 0,
  trim_end_s double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_audio_wt ON public.spatial_audio_assets(walkthrough_id);

ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS orientation jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.spatial_project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pin_id uuid REFERENCES public.spatial_pins(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'general'
    CHECK (type IN ('observation','question','issue','safety','punch','rfi_reference','submittal_reference','voice_note','general')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','waiting','closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_key text,
  visibility text NOT NULL DEFAULT 'client'
    CHECK (visibility IN ('internal','client','consultant','subcontractor','bidder','public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spi_project ON public.spatial_project_items(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.spatial_project_item_locators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'walkthrough'
    CHECK (kind IN ('plan','walkthrough','station','twin','geospatial')),
  walkthrough_id uuid REFERENCES public.spatial_walkthroughs(id) ON DELETE SET NULL,
  clip_id uuid REFERENCES public.spatial_clips(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.spatial_chapters(id) ON DELETE SET NULL,
  t_seconds double precision,
  yaw_deg double precision,
  pitch_deg double precision,
  path_anchor text,
  station_id text,
  model_id uuid,
  plan_locator jsonb,
  xyz jsonb,
  geospatial jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spi_loc_item ON public.spatial_project_item_locators(item_id);
ALTER TABLE public.spatial_project_item_locators ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.spatial_project_item_locators ADD COLUMN IF NOT EXISTS path_anchor text;
ALTER TABLE public.spatial_project_item_locators ADD COLUMN IF NOT EXISTS station_id text;
ALTER TABLE public.spatial_project_item_locators ADD COLUMN IF NOT EXISTS model_id uuid;
ALTER TABLE public.spatial_project_item_locators ADD COLUMN IF NOT EXISTS geospatial jsonb;

CREATE TABLE IF NOT EXISTS public.spatial_project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other'
    CHECK (type IN (
      'drawing','permit_set','rfi','submittal','spec','contract','purchase_order','change_order',
      'invoice','meeting_minutes','safety','report','photo','thermal_image','screenshot','other'
    )),
  title text NOT NULL,
  slatedrop_id uuid REFERENCES public.slatedrop_uploads(id) ON DELETE SET NULL,
  source_provider text NOT NULL DEFAULT 'slatedrop'
    CHECK (source_provider IN ('slatedrop','url','procore')),
  source_external_id text,
  source_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spd_project ON public.spatial_project_documents(project_id);

CREATE TABLE IF NOT EXISTS public.spatial_project_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  voice_asset_id uuid REFERENCES public.spatial_audio_assets(id) ON DELETE SET NULL,
  file_document_id uuid REFERENCES public.spatial_project_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spi_cmt_item ON public.spatial_project_item_comments(item_id, created_at);

CREATE TABLE IF NOT EXISTS public.spatial_project_item_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('created','commented','assigned','status_changed','file_added','closed','question_created','question_replied','question_resolved')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spi_act_item ON public.spatial_project_item_activity(item_id, created_at);

CREATE TABLE IF NOT EXISTS public.spatial_project_item_files (
  item_id uuid NOT NULL REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.spatial_project_documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, document_id)
);

ALTER TABLE public.spatial_pins
  ADD COLUMN IF NOT EXISTS project_item_id uuid REFERENCES public.spatial_project_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sw_pins_item ON public.spatial_pins(project_item_id);

ALTER TABLE public.digital_twin_models
  ADD COLUMN IF NOT EXISTS t_model_to_project jsonb;

CREATE TABLE IF NOT EXISTS public.spatial_project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text,
  recipient_name text,
  recipient_email text,
  password_hash text,
  expires_at timestamptz,
  max_views integer CHECK (max_views IS NULL OR max_views > 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  allow_download boolean NOT NULL DEFAULT false,
  allow_embed boolean NOT NULL DEFAULT false,
  is_revoked boolean NOT NULL DEFAULT false,
  branding_snapshot jsonb,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.spatial_project_shares ADD COLUMN IF NOT EXISTS branding_snapshot jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sps_token_hash ON public.spatial_project_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_sps_project ON public.spatial_project_shares(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.spatial_project_share_grants (
  share_id uuid PRIMARY KEY REFERENCES public.spatial_project_shares(id) ON DELETE CASCADE,
  can_comment boolean NOT NULL DEFAULT true,
  can_create_items boolean NOT NULL DEFAULT false,
  can_see_documents boolean NOT NULL DEFAULT true,
  can_see_internal_items boolean NOT NULL DEFAULT false,
  can_measure boolean NOT NULL DEFAULT false,
  visible_item_visibilities text[] NOT NULL DEFAULT ARRAY['client']::text[]
);

CREATE TABLE IF NOT EXISTS public.spatial_notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('question_created','question_replied','question_resolved')),
  deep_link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_status text NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending','skipped','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sne_project ON public.spatial_notification_events(project_id, created_at DESC);

ALTER TABLE public.spatial_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_locators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_share_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_notification_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY spi_org_all ON public.spatial_project_items FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_items.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_items.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY spi_loc_org_all ON public.spatial_project_item_locators FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_locators.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_locators.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY spd_org_all ON public.spatial_project_documents FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_documents.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_documents.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY spi_cmt_org_all ON public.spatial_project_item_comments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_comments.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_comments.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY spi_act_org_all ON public.spatial_project_item_activity FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_activity.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_activity.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY spi_files_org_all ON public.spatial_project_item_files FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_files.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_item_files.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sps_org_all ON public.spatial_project_shares FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_shares.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_shares.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sne_org_all ON public.spatial_notification_events FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_notification_events.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_notification_events.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON TABLE public.spatial_project_items FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_locators FROM anon;
REVOKE ALL ON TABLE public.spatial_project_documents FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_comments FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_activity FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_files FROM anon;
REVOKE ALL ON TABLE public.spatial_project_shares FROM anon;
REVOKE ALL ON TABLE public.spatial_notification_events FROM anon;
