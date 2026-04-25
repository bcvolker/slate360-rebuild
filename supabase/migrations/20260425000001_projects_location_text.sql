-- 20260425000001_projects_location_text.sql
-- Fixes: projects.location was jsonb, should be text (per latest schema)

BEGIN;

ALTER TABLE public.projects
  ALTER COLUMN location TYPE text USING location::text;

COMMIT;

