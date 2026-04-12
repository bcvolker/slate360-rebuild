-- Site Walk deliverables: compiled reports / PDFs / share-links from sessions.
-- Stores block-editor JSON and share state.

CREATE TABLE IF NOT EXISTS public.site_walk_deliverables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title           text NOT NULL DEFAULT 'Untitled Report',
  deliverable_type text NOT NULL CHECK (deliverable_type IN ('report','punchlist','photo_log','custom')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','shared','archived')),
  content         jsonb NOT NULL DEFAULT '[]',   -- Block-editor blocks array

  -- Sharing
  share_token     text UNIQUE,
  shared_at       timestamptz,

  -- PDF / export
  export_s3_key   text,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_site_walk_deliverables_session ON public.site_walk_deliverables(session_id);
CREATE INDEX idx_site_walk_deliverables_org ON public.site_walk_deliverables(org_id);
CREATE INDEX idx_site_walk_deliverables_share ON public.site_walk_deliverables(share_token) WHERE share_token IS NOT NULL;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_site_walk_deliverables_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_site_walk_deliverables_updated_at
  BEFORE UPDATE ON public.site_walk_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_deliverables_updated_at();

-- RLS
ALTER TABLE public.site_walk_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_walk_deliverables_select_org" ON public.site_walk_deliverables FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_deliverables_insert_org" ON public.site_walk_deliverables FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_deliverables_update_org" ON public.site_walk_deliverables FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_deliverables_delete_org" ON public.site_walk_deliverables FOR DELETE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

-- Public read for shared deliverables (no auth required when share_token matches)
CREATE POLICY "site_walk_deliverables_public_shared" ON public.site_walk_deliverables FOR SELECT
  USING (status = 'shared' AND share_token IS NOT NULL);
