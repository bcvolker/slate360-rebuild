-- deliverable_access_tokens: token-gated public access to deliverables.
--
-- Each row represents a shareable link like /share/[token] that grants
-- read-only access to a specific deliverable (tour, report, walk, etc.)
-- without requiring a Slate360 account.
--
-- Token consumers see the org Walled Garden branding.

CREATE TABLE IF NOT EXISTS public.deliverable_access_tokens (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token            text        NOT NULL UNIQUE,
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  deliverable_type text        NOT NULL CHECK (deliverable_type IN ('tour', 'report', 'walk', 'file')),
  deliverable_id   uuid        NOT NULL,
  role             text        NOT NULL DEFAULT 'view' CHECK (role IN ('view', 'download', 'comment')),
  expires_at       timestamptz,
  max_views        integer,
  view_count       integer     NOT NULL DEFAULT 0,
  is_revoked       boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_viewed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dat_token ON public.deliverable_access_tokens (token);
CREATE INDEX IF NOT EXISTS idx_dat_org   ON public.deliverable_access_tokens (org_id);

ALTER TABLE public.deliverable_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY dat_select_own_org ON public.deliverable_access_tokens
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY dat_insert_own_org ON public.deliverable_access_tokens
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()));

REVOKE ALL ON TABLE public.deliverable_access_tokens FROM anon;
