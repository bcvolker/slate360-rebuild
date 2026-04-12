-- Phase 6b: Plan uploads, pins, and templates
-- Plans are uploaded floor plans / site maps. Pins mark item locations on plans.
-- Templates are reusable checklists that can pre-populate session items.

-- ─── site_walk_plans ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_walk_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES site_walk_sessions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0),
  s3_key text NOT NULL,
  file_id uuid REFERENCES slatedrop_uploads(id) ON DELETE SET NULL,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_session ON site_walk_plans (session_id);

ALTER TABLE site_walk_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans: org members can view"
  ON site_walk_plans FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Plans: org members can insert"
  ON site_walk_plans FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Plans: org members can update"
  ON site_walk_plans FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Plans: org members can delete"
  ON site_walk_plans FOR DELETE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_site_walk_plans_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON site_walk_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_plans_updated_at();

-- ─── site_walk_pins ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_walk_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES site_walk_plans(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES site_walk_items(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  x_pct numeric(7,4) NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct numeric(7,4) NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  pin_number integer,
  pin_color text NOT NULL DEFAULT 'blue'
    CHECK (pin_color IN ('blue','green','amber','red','gray','purple')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pins_plan ON site_walk_pins (plan_id);
CREATE INDEX IF NOT EXISTS idx_pins_item ON site_walk_pins (item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pins_plan_item ON site_walk_pins (plan_id, item_id);

ALTER TABLE site_walk_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pins: org members can view"
  ON site_walk_pins FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Pins: org members can insert"
  ON site_walk_pins FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Pins: org members can delete"
  ON site_walk_pins FOR DELETE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

-- ─── site_walk_templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_walk_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0),
  description text,
  template_type text NOT NULL DEFAULT 'checklist'
    CHECK (template_type IN ('checklist','inspection','punch','proposal')),
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON site_walk_templates (org_id);

ALTER TABLE site_walk_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates: org members can view"
  ON site_walk_templates FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Templates: org members can insert"
  ON site_walk_templates FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Templates: org members can update"
  ON site_walk_templates FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Templates: org members can delete"
  ON site_walk_templates FOR DELETE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_site_walk_templates_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON site_walk_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_templates_updated_at();
