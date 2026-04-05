-- JWT Auth Hook: inject org_branding_version into access-token claims.
--
-- Supabase calls this function on every token mint / refresh when the
-- hook is enabled in Dashboard → Auth → Hooks → "Custom Access Token".
--
-- The hook adds:
--   app_metadata.org_branding_version  (integer epoch seconds of last branding update)
--
-- Clients can compare this value against a cached version to know when
-- to re-fetch branding assets — zero-latency invalidation without polling.
--
-- Depends on: org_branding table (20260408000002_org_branding.sql)

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_org_id      uuid;
  v_branding_ts timestamptz;
  v_version     integer;
  v_claims      jsonb;
BEGIN
  -- Extract the claims object from the event
  v_claims := event->'claims';

  -- Resolve user ID from the JWT sub claim
  v_user_id := (v_claims->>'sub')::uuid;

  -- Look up the user's org
  SELECT om.org_id INTO v_org_id
  FROM organization_members om
  WHERE om.user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- No org membership — return claims unchanged
    RETURN event;
  END IF;

  -- Fetch the branding updated_at timestamp
  SELECT ob.updated_at INTO v_branding_ts
  FROM org_branding ob
  WHERE ob.org_id = v_org_id;

  IF v_branding_ts IS NOT NULL THEN
    v_version := EXTRACT(EPOCH FROM v_branding_ts)::integer;
  ELSE
    -- No custom branding row — use 0 (means default branding)
    v_version := 0;
  END IF;

  -- Merge into app_metadata within the claims
  v_claims := jsonb_set(
    v_claims,
    '{app_metadata}',
    COALESCE(v_claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('org_branding_version', v_version)
  );

  -- Write the modified claims back into the event
  event := jsonb_set(event, '{claims}', v_claims);

  RETURN event;
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
  'Supabase Auth Hook: injects org_branding_version into JWT app_metadata '
  'so clients can detect branding changes without polling.';

-- Grant Supabase Auth (supabase_auth_admin) permission to invoke the hook.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Revoke from normal roles — only Auth service should call this.
REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated;
