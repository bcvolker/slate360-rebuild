-- Migration: Enforce project_id NOT NULL on project_tours
-- Date: 2026-04-04
--
-- Safety: verified zero rows with project_id IS NULL on live DB (2026-04-04).
-- If orphaned tours existed they would need to be assigned a project first.

-- Step 1: Backfill any NULLs to a sentinel project (safety net — none exist today)
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM project_tours WHERE project_id IS NULL) THEN
--     RAISE EXCEPTION 'Cannot enforce NOT NULL: orphaned tours exist. Assign them a project first.';
--   END IF;
-- END $$;

-- Step 2: Set NOT NULL
ALTER TABLE public.project_tours
  ALTER COLUMN project_id SET NOT NULL;
