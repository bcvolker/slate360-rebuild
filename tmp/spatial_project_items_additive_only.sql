-- Additive-only extract of 20260830200000_spatial_project_items.sql
-- STOPPED the original DROP CONSTRAINT / ADD CHECK on spatial_audio_assets_kind_check.
-- Tables/indexes/RLS only. Voice-comment kind remains unwidened until reviewed.

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
CREATE INDEX IF NOT EXISTS idx_spi_assignee ON public.spatial_project_items(assignee_id, status);

CREATE TABLE IF NOT EXISTS public.spatial_project_item_locators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.spatial_project_items(id) ON DELETE CASCADE,
  walkthrough_id uuid REFERENCES public.spatial_walkthroughs(id) ON DELETE SET NULL,
  clip_id uuid REFERENCES public.spatial_clips(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.spatial_chapters(id) ON DELETE SET NULL,
  t_seconds double precision,
  yaw_deg double precision,
  pitch_deg double precision,
  plan_locator jsonb,
  xyz jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spi_loc_item ON public.spatial_project_item_locators(item_id);

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
  kind text NOT NULL CHECK (kind IN ('created','commented','assigned','status_changed','file_added','closed')),
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

ALTER TABLE public.spatial_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_locators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_item_files ENABLE ROW LEVEL SECURITY;

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

REVOKE ALL ON TABLE public.spatial_project_items FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_locators FROM anon;
REVOKE ALL ON TABLE public.spatial_project_documents FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_comments FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_activity FROM anon;
REVOKE ALL ON TABLE public.spatial_project_item_files FROM anon;
