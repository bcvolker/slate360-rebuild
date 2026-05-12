-- Enable Supabase Realtime for site_walk_plan_sheets
-- Required so usePlanSheetsRealtime hook receives live postgres_changes events
-- when Trigger.dev writes rasterized_key / rasterized_width / rasterized_height.
--
-- The DO block is idempotent: it only executes the ALTER PUBLICATION if the
-- table is not already a member of supabase_realtime.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_walk_plan_sheets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_walk_plan_sheets;
  END IF;
END;
$$;
