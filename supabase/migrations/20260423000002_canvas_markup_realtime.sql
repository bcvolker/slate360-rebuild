-- Phase 7a: Canvas markup data + realtime publication.
--
-- Adds a `markup_data jsonb` column to both `site_walk_items` and
-- `site_walk_pins` so the frontend canvas (Konva/Fabric) can persist
-- vector primitives (boxes, arrows, freehand strokes, rotation, stroke
-- color, etc.) as selectable / movable objects rather than flattened raster.
--
-- Also enables realtime broadcasts on these tables so multiple connected
-- users see pin moves and item inserts/updates instantly.

-- ── markup_data columns ───────────────────────────────────────────────────

ALTER TABLE public.site_walk_items
  ADD COLUMN IF NOT EXISTS markup_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.site_walk_pins
  ADD COLUMN IF NOT EXISTS markup_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Pins didn't previously have an updated_at; needed for realtime UPDATE
-- ordering and conflict resolution as users drag them around.
ALTER TABLE public.site_walk_pins
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_site_walk_pins_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_walk_pins_updated_at ON public.site_walk_pins;
CREATE TRIGGER trg_site_walk_pins_updated_at
  BEFORE UPDATE ON public.site_walk_pins
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_pins_updated_at();

-- The original pins migration shipped SELECT/INSERT/DELETE but not UPDATE.
-- Pins now need to be moved (x_pct/y_pct drag) and re-styled, so add UPDATE.
DROP POLICY IF EXISTS "Pins: org members can update" ON public.site_walk_pins;
CREATE POLICY "Pins: org members can update"
  ON public.site_walk_pins FOR UPDATE
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

-- ── Realtime publication ──────────────────────────────────────────────────
--
-- Supabase ships a `supabase_realtime` publication; tables must be added
-- explicitly to receive WAL broadcasts. The DO block tolerates the table
-- already being a member (idempotent re-runs).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_pins;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Ensure realtime UPDATE payloads include the previous row (so the client
-- can diff x_pct / y_pct deltas without an extra fetch).
ALTER TABLE public.site_walk_items REPLICA IDENTITY FULL;
ALTER TABLE public.site_walk_pins REPLICA IDENTITY FULL;
