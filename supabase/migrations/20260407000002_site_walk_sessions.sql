-- Migration: Create site_walk_sessions table
-- Date: 2026-04-04
--
-- Core table for the Site Walk (PunchWalk) app.
-- Enforces project_id NOT NULL from day one for ecosystem synergy.

CREATE TABLE IF NOT EXISTS public.site_walk_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_walk_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_site_walk_sessions_org ON public.site_walk_sessions(org_id);
CREATE INDEX idx_site_walk_sessions_project ON public.site_walk_sessions(project_id);

-- RLS: org members only
CREATE POLICY site_walk_sessions_select_org
  ON public.site_walk_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = site_walk_sessions.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY site_walk_sessions_insert_org
  ON public.site_walk_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = site_walk_sessions.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY site_walk_sessions_update_org
  ON public.site_walk_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = site_walk_sessions.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY site_walk_sessions_delete_org
  ON public.site_walk_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = site_walk_sessions.org_id
        AND om.user_id = auth.uid()
    )
  );
