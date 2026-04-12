-- Site Walk items: photos, notes, voice memos captured during a session.
-- Each item belongs to a session and has a sort_order for reordering.

CREATE TABLE IF NOT EXISTS public.site_walk_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  item_type   text NOT NULL CHECK (item_type IN ('photo','video','text_note','voice_note','annotation')),
  title       text NOT NULL DEFAULT '',
  description text,
  file_id     uuid REFERENCES public.slatedrop_uploads(id) ON DELETE SET NULL,
  s3_key      text,

  -- Location + metadata
  latitude    double precision,
  longitude   double precision,
  location_label text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  weather     jsonb,
  metadata    jsonb NOT NULL DEFAULT '{}',

  -- Ordering
  sort_order  integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_site_walk_items_session ON public.site_walk_items(session_id);
CREATE INDEX idx_site_walk_items_org ON public.site_walk_items(org_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_site_walk_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_site_walk_items_updated_at
  BEFORE UPDATE ON public.site_walk_items
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_items_updated_at();

-- RLS
ALTER TABLE public.site_walk_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_walk_items_select_org" ON public.site_walk_items FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_items_insert_org" ON public.site_walk_items FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_items_update_org" ON public.site_walk_items FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "site_walk_items_delete_org" ON public.site_walk_items FOR DELETE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
