-- Invitation tokens for CEO beta access, beta-tester viral invites,
-- and collaborator project-scoped access.

CREATE TABLE IF NOT EXISTS public.invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  invite_type text NOT NULL CHECK (invite_type IN ('ceo', 'beta', 'collaborator')),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL,
  max_redemptions integer NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_created_by
  ON public.invitation_tokens(created_by);

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_org
  ON public.invitation_tokens(org_id)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_project
  ON public.invitation_tokens(project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitation_tokens_select_own_scope ON public.invitation_tokens;
CREATE POLICY invitation_tokens_select_own_scope
  ON public.invitation_tokens
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR org_id IN (
      SELECT om.org_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invitation_tokens_insert_own_scope ON public.invitation_tokens;
CREATE POLICY invitation_tokens_insert_own_scope
  ON public.invitation_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      org_id IS NULL
      OR org_id IN (
        SELECT om.org_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS invitation_tokens_update_own_scope ON public.invitation_tokens;
CREATE POLICY invitation_tokens_update_own_scope
  ON public.invitation_tokens
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR org_id IN (
      SELECT om.org_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR org_id IN (
      SELECT om.org_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.invitation_tokens FROM anon;