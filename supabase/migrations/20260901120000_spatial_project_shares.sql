-- Project-level client portal shares. Additive. Mirrors the proven
-- spatial_share_tokens pattern (hashed token, hashed password, expiry,
-- revoke, view count) but scopes to a whole project rather than one
-- walkthrough, so a single link can surface capture history across many
-- dated Walkthrough/Twin deliverables.
--
-- Not applied to any database by this branch. Additive-only per project
-- convention; apply via the Supabase Management API.

CREATE TABLE IF NOT EXISTS public.spatial_project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text,
  recipient_name text,
  recipient_email text,
  password_hash text,
  expires_at timestamptz,
  max_views integer CHECK (max_views IS NULL OR max_views > 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  allow_download boolean NOT NULL DEFAULT false,
  allow_embed boolean NOT NULL DEFAULT false,
  is_revoked boolean NOT NULL DEFAULT false,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sps_token_hash ON public.spatial_project_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_sps_project ON public.spatial_project_shares(project_id, created_at DESC);

-- Per-share visibility of item types and internal-only project documents.
-- Defaults are intentionally conservative: internal items and internal
-- documents are never client-visible unless explicitly granted.
CREATE TABLE IF NOT EXISTS public.spatial_project_share_grants (
  share_id uuid PRIMARY KEY REFERENCES public.spatial_project_shares(id) ON DELETE CASCADE,
  can_comment boolean NOT NULL DEFAULT true,
  can_create_items boolean NOT NULL DEFAULT true,
  can_see_documents boolean NOT NULL DEFAULT true,
  can_see_internal_items boolean NOT NULL DEFAULT false,
  can_measure boolean NOT NULL DEFAULT false,
  visible_item_visibilities text[] NOT NULL DEFAULT ARRAY['client']::text[]
);

ALTER TABLE public.spatial_project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_project_share_grants ENABLE ROW LEVEL SECURITY;

-- Creator-side access only (org membership). The public portal route reads
-- via the service-role admin client after resolving+validating the token
-- server-side, exactly like spatial_share_tokens — anon clients never query
-- this table directly, so there is no anon SELECT policy.
DO $$ BEGIN
  CREATE POLICY sps_org_all ON public.spatial_project_shares FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_shares.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_project_shares.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sps_grants_org_all ON public.spatial_project_share_grants FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.spatial_project_shares s
      JOIN public.organization_members om ON om.org_id = s.org_id AND om.user_id = auth.uid()
      WHERE s.id = spatial_project_share_grants.share_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.spatial_project_shares s
      JOIN public.organization_members om ON om.org_id = s.org_id AND om.user_id = auth.uid()
      WHERE s.id = spatial_project_share_grants.share_id
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_spatial_project_shares_updated_at
    BEFORE UPDATE ON public.spatial_project_shares
    FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
