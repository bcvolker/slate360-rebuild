-- Migration: Atomic RPC functions for TOCTOU fixes
-- Date: 2025-04-05
-- Fixes: Portal view_count race condition, credits balance race condition

-- 0. Ensure credits_balance column exists on organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0;

-- 1. Atomic view claim: increments view_count only if the token is still valid.
--    Returns the updated row if successful, empty set if denied.
CREATE OR REPLACE FUNCTION public.claim_deliverable_view(p_token text)
RETURNS SETOF deliverable_access_tokens
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE deliverable_access_tokens
  SET view_count    = view_count + 1,
      last_viewed_at = now()
  WHERE token      = p_token
    AND is_revoked  = false
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_views  IS NULL OR view_count < max_views)
  RETURNING *;
$$;

-- 2. Atomic credit addition: avoids read-add-write TOCTOU.
CREATE OR REPLACE FUNCTION public.add_purchased_credits(p_org_id uuid, p_amount int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE organizations
  SET credits_balance = COALESCE(credits_balance, 0) + p_amount
  WHERE id = p_org_id;
$$;
