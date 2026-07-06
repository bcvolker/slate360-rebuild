-- ============================================================================
-- 360 Tour Builder — plan-sheet tour (§8.3 of TOUR_BUILDER_PLAN.md)
-- Reuses Site Walk's existing project-scoped plan sheets (site_walk_plan_sets/
-- site_walk_plan_sheets — already rasterized single-image sheets, no tiling
-- needed) rather than duplicating rasterization for a second time. A tour can
-- optionally anchor to one plan set; tour_plan_pins places numbered pins on a
-- sheet that "dive" into a tour scene, per the accepted recipient motion spec.
-- This is the concrete embodiment of cross-app project continuity: a plan set
-- uploaded via Site Walk becomes usable by any tour in the same project.
-- Idempotent.
-- ============================================================================

ALTER TABLE public.project_tours
  ADD COLUMN IF NOT EXISTS plan_set_id uuid REFERENCES public.site_walk_plan_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tours_plan_set
  ON public.project_tours(plan_set_id) WHERE plan_set_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tour_plan_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  plan_sheet_id uuid NOT NULL REFERENCES public.site_walk_plan_sheets(id) ON DELETE CASCADE,
  scene_id uuid NOT NULL REFERENCES public.tour_scenes(id) ON DELETE CASCADE,
  -- Mirrors site_walk_pins' x_pct/y_pct convention exactly (0-100, percent of
  -- the sheet image's width/height) for consistency across the two features.
  x_pct numeric(7,4) NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct numeric(7,4) NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  pin_number integer NOT NULL,
  title text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_plan_pins_tour ON public.tour_plan_pins(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_plan_pins_sheet ON public.tour_plan_pins(plan_sheet_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tour_plan_pins_sheet_number
  ON public.tour_plan_pins(plan_sheet_id, pin_number);

ALTER TABLE public.tour_plan_pins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members view tour plan pins" ON public.tour_plan_pins
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_plan_pins.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "org members edit tour plan pins" ON public.tour_plan_pins
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_plan_pins.org_id AND om.user_id = auth.uid()
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = tour_plan_pins.org_id AND om.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tour_plan_pins_updated_at
    BEFORE UPDATE ON public.tour_plan_pins
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime so the desktop pin-authoring UI updates live (matches tour_scenes/
-- tour_processing_jobs pattern from the P0 migration).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_plan_pins;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
