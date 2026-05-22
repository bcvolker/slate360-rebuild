-- Migration: 20260521000100_site_walk_capture_v2_phase2.sql
-- Site Walk Capture V2 — Phase 2 greenfield tables (scene context + co-pilot).

CREATE TABLE IF NOT EXISTS public.site_walk_scene_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  polygon_boundaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  logistics_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_walk_copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_walk_session_id UUID NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  livekit_room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.site_walk_copilot_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  copilot_session_id UUID NOT NULL REFERENCES public.site_walk_copilot_sessions(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  permitted_role TEXT NOT NULL DEFAULT 'co_pilot_collaborator',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE public.site_walk_copilot_sessions
    DROP CONSTRAINT IF EXISTS sw_copilot_sessions_status_check;
  ALTER TABLE public.site_walk_copilot_sessions
    ADD CONSTRAINT sw_copilot_sessions_status_check
    CHECK (status IN ('pending', 'active', 'ended', 'failed'));

  ALTER TABLE public.site_walk_copilot_invites
    DROP CONSTRAINT IF EXISTS sw_copilot_invites_role_check;
  ALTER TABLE public.site_walk_copilot_invites
    ADD CONSTRAINT sw_copilot_invites_role_check
    CHECK (permitted_role IN ('co_pilot_view_only', 'co_pilot_collaborator'));
END $$;

CREATE INDEX IF NOT EXISTS idx_sw_scene_contexts_session
  ON public.site_walk_scene_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_sw_scene_contexts_project
  ON public.site_walk_scene_contexts(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sw_copilot_invites_token_hash
  ON public.site_walk_copilot_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_sw_copilot_sessions_walk
  ON public.site_walk_copilot_sessions(site_walk_session_id);

CREATE OR REPLACE FUNCTION public.set_site_walk_scene_contexts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_walk_scene_contexts_updated_at ON public.site_walk_scene_contexts;
CREATE TRIGGER trg_site_walk_scene_contexts_updated_at
  BEFORE UPDATE ON public.site_walk_scene_contexts
  FOR EACH ROW EXECUTE FUNCTION public.set_site_walk_scene_contexts_updated_at();

ALTER TABLE public.site_walk_scene_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_walk_copilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_walk_copilot_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_scene_contexts_select ON public.site_walk_scene_contexts;
DROP POLICY IF EXISTS policy_scene_contexts_insert ON public.site_walk_scene_contexts;
DROP POLICY IF EXISTS policy_scene_contexts_update ON public.site_walk_scene_contexts;
DROP POLICY IF EXISTS policy_scene_contexts_delete ON public.site_walk_scene_contexts;

CREATE POLICY policy_scene_contexts_select ON public.site_walk_scene_contexts
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_scene_contexts_insert ON public.site_walk_scene_contexts
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_scene_contexts_update ON public.site_walk_scene_contexts
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_scene_contexts_delete ON public.site_walk_scene_contexts
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

DROP POLICY IF EXISTS policy_copilot_sessions_select ON public.site_walk_copilot_sessions;
DROP POLICY IF EXISTS policy_copilot_sessions_insert ON public.site_walk_copilot_sessions;
DROP POLICY IF EXISTS policy_copilot_sessions_update ON public.site_walk_copilot_sessions;

CREATE POLICY policy_copilot_sessions_select ON public.site_walk_copilot_sessions
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_copilot_sessions_insert ON public.site_walk_copilot_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_copilot_sessions_update ON public.site_walk_copilot_sessions
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

DROP POLICY IF EXISTS policy_copilot_invites_select ON public.site_walk_copilot_invites;
DROP POLICY IF EXISTS policy_copilot_invites_insert ON public.site_walk_copilot_invites;
DROP POLICY IF EXISTS policy_copilot_invites_update ON public.site_walk_copilot_invites;

CREATE POLICY policy_copilot_invites_select ON public.site_walk_copilot_invites
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_copilot_invites_insert ON public.site_walk_copilot_invites
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY policy_copilot_invites_update ON public.site_walk_copilot_invites
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

COMMENT ON TABLE public.site_walk_scene_contexts IS
  'Geospatial scene boundaries and logistics milestones for Capture V2.';
COMMENT ON TABLE public.site_walk_copilot_sessions IS
  'LiveKit room sessions for remote Site Walk co-pilot.';
COMMENT ON TABLE public.site_walk_copilot_invites IS
  'Hashed invite tokens for remote co-pilot portal access.';
