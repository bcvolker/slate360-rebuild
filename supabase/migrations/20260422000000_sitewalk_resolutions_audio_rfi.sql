-- PR #28a: Resolution captures + raw audio + RFI/estimate deliverables
--
-- The "Before & After" relationship reuses the existing site_walk_items.before_item_id
-- column (added in 20260412000008) instead of adding a duplicate parent_item_id.
--
-- This migration only adds:
--   1. item_relationship — classifies WHY this item points at a before_item_id
--   2. audio_s3_key      — raw audio blob for voice notes (separate from
--                         the file_id → slatedrop_uploads link, which carries
--                         photo/video files)
--   3. Expanded deliverable_type CHECK to include 'rfi' and 'estimate'.
--      deliverable_type is a TEXT + CHECK column, NOT a Postgres ENUM, so
--      `ALTER TYPE … ADD VALUE` would fail. Drop and re-add the CHECK.

-- 1. Resolution / rework relationship
ALTER TABLE public.site_walk_items
  ADD COLUMN IF NOT EXISTS item_relationship text NOT NULL DEFAULT 'standalone'
    CHECK (item_relationship IN ('standalone', 'resolution', 'rework'));

CREATE INDEX IF NOT EXISTS idx_site_walk_items_before
  ON public.site_walk_items (before_item_id)
  WHERE before_item_id IS NOT NULL;

-- 2. Raw audio storage for voice items
ALTER TABLE public.site_walk_items
  ADD COLUMN IF NOT EXISTS audio_s3_key text;

-- 3. Expand deliverable types to include rfi + estimate
ALTER TABLE public.site_walk_deliverables
  DROP CONSTRAINT IF EXISTS site_walk_deliverables_deliverable_type_check;

ALTER TABLE public.site_walk_deliverables
  ADD CONSTRAINT site_walk_deliverables_deliverable_type_check
  CHECK (deliverable_type IN ('report', 'punchlist', 'photo_log', 'rfi', 'estimate', 'custom'));

-- 4. Realtime publication for the field/office inbox.
--    Items + comments need to broadcast row changes so the inbox can update
--    without polling. supabase_realtime publication is created by Supabase by
--    default; we only need to ADD tables (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
