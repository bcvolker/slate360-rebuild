-- Commit 4: Before/After + Progression
--
-- Extend item_relationship to recognize progression roles in addition to the
-- existing rework/resolution semantics. The 'before' / 'after' / 'progress'
-- values let the UI render dedicated comparison and timeline views without
-- introducing a parallel item_role column.
--
--   standalone — default (no relationship to another item)
--   resolution — closes a prior issue (existing)
--   rework     — redoes a prior item (existing)
--   before     — explicitly the "before" half of a paired comparison
--   after      — explicitly the "after" half of a paired comparison
--   progress   — one step in a multi-photo progression timeline at one location

ALTER TABLE public.site_walk_items
  DROP CONSTRAINT IF EXISTS site_walk_items_item_relationship_check;

ALTER TABLE public.site_walk_items
  ADD CONSTRAINT site_walk_items_item_relationship_check
  CHECK (item_relationship IN ('standalone', 'resolution', 'rework', 'before', 'after', 'progress'));

-- Project-wide progression view fetches by (project_id, location_label) ordered
-- by created_at. Add a partial index covering rows that participate in a
-- progression so the timeline page is cheap.
CREATE INDEX IF NOT EXISTS idx_site_walk_items_progression
  ON public.site_walk_items (project_id, location_label, created_at)
  WHERE item_relationship IN ('before', 'after', 'progress');
