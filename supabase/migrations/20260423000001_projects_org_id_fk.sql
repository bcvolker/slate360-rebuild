-- Backfill migration: document the FK that already exists in production.
-- The original `projects` table (20260223_create_projects.sql) declared
-- `org_id uuid NOT NULL` without a FK. The FK was added directly in prod.
-- This migration is idempotent — re-creates the constraint only if absent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_org_id_fkey'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_org_id_fkey
      FOREIGN KEY (org_id)
      REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Index is implicit on FK target; add an explicit index on the source side
-- to keep org-scoped project lookups fast.
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects (org_id);
