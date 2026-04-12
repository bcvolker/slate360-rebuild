-- Site Walk comments: threaded comments on sessions or individual items.
-- Supports both session-level and item-level threads.

CREATE TABLE IF NOT EXISTS public.site_walk_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  item_id     uuid REFERENCES public.site_walk_items(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.site_walk_comments(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  body        text NOT NULL CHECK (char_length(body) > 0),
  is_field    boolean NOT NULL DEFAULT false,   -- true = from field device, false = from office

  -- Read receipt tracking
  read_by     uuid[] NOT NULL DEFAULT '{}',

  -- Escalation
  is_escalation boolean NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swc_session ON public.site_walk_comments(session_id);
CREATE INDEX idx_swc_item ON public.site_walk_comments(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_swc_parent ON public.site_walk_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_site_walk_comments_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_site_walk_comments_updated_at
  BEFORE UPDATE ON public.site_walk_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_comments_updated_at();

ALTER TABLE public.site_walk_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swc_select_org" ON public.site_walk_comments FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swc_insert_org" ON public.site_walk_comments FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swc_update_org" ON public.site_walk_comments FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swc_delete_author" ON public.site_walk_comments FOR DELETE
  USING (author_id = auth.uid());


-- Site Walk assignments: tasks assigned from office to field (or vice versa).

CREATE TABLE IF NOT EXISTS public.site_walk_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  item_id       uuid REFERENCES public.site_walk_items(id) ON DELETE SET NULL,

  assigned_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title         text NOT NULL CHECK (char_length(title) > 0),
  description   text,
  priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'done', 'rejected')),
  due_date      date,

  -- Acknowledgment tracking
  acknowledged_at timestamptz,
  completed_at    timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swa_session ON public.site_walk_assignments(session_id);
CREATE INDEX idx_swa_assigned_to ON public.site_walk_assignments(assigned_to);
CREATE INDEX idx_swa_status ON public.site_walk_assignments(status) WHERE status NOT IN ('done', 'rejected');

CREATE OR REPLACE FUNCTION public.set_site_walk_assignments_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_site_walk_assignments_updated_at
  BEFORE UPDATE ON public.site_walk_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_assignments_updated_at();

ALTER TABLE public.site_walk_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swa_select_org" ON public.site_walk_assignments FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swa_insert_org" ON public.site_walk_assignments FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swa_update_org" ON public.site_walk_assignments FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
CREATE POLICY "swa_delete_assigner" ON public.site_walk_assignments FOR DELETE
  USING (assigned_by = auth.uid());
