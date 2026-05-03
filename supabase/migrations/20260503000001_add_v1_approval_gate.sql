-- V1 Foundational Release — Approval Gate
-- Extends profiles with V1 access status columns.
-- Backfills from existing is_beta_approved column.
-- Adds sync trigger + App Store reviewer auto-approval trigger.
--
-- account_status values:
--   pending_approval  — account created, awaiting admin approval (default for new signups)
--   approved          — full V1 shell access granted
--   suspended         — access revoked after previous approval

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending_approval'
    CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('pending_approval', 'approved', 'suspended')),
  ADD COLUMN IF NOT EXISTS is_app_reviewer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_foundational_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signup_org_request text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.profiles.account_status IS
  'V1 Foundational Release access gate. pending_approval: awaiting admin approval. approved: full shell access. suspended: revoked. Managed via Operations Console.';
COMMENT ON COLUMN public.profiles.is_app_reviewer IS
  'True for App Store / Play Console reviewer accounts. Bypasses account_status gate entirely. Set only via admin API.';
COMMENT ON COLUMN public.profiles.is_foundational_user IS
  'True for users approved during V1 Foundational Release window. Grants 1-year data retention + V2 discount eligibility.';
COMMENT ON COLUMN public.profiles.signup_org_request IS
  'Organization name supplied during signup (e.g. "ASU Capital Programs"). Informs approval decisions.';

-- Backfill: any row already marked is_beta_approved gets account_status='approved'
UPDATE public.profiles
SET account_status = 'approved'
WHERE is_beta_approved = true AND account_status = 'pending_approval';

-- Mark existing approved users as foundational users
UPDATE public.profiles
SET is_foundational_user = true
WHERE account_status = 'approved';

-- ── Sync trigger ────────────────────────────────────────────────────
-- Keeps is_beta_approved aligned whenever account_status is updated,
-- so existing code that reads is_beta_approved continues to work.
CREATE OR REPLACE FUNCTION public.sync_account_status_to_beta_approved()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_status = 'approved' THEN
    NEW.is_beta_approved := true;
  ELSIF NEW.account_status IN ('pending_approval', 'suspended') THEN
    NEW.is_beta_approved := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_status ON public.profiles;
CREATE TRIGGER trg_sync_account_status
  BEFORE UPDATE OF account_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_account_status_to_beta_approved();

-- ── Auto-approve App Store / Play Console reviewer accounts ─────────
-- Any profile whose email matches the reviewer pattern gets
-- is_app_reviewer=true and account_status='approved' automatically.
-- Pattern: email ending in +ios@slate360.ai or +android@slate360.ai
-- This fires on INSERT and on UPDATE OF email so re-seeded accounts
-- also get caught.
CREATE OR REPLACE FUNCTION public.auto_set_app_reviewer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email ILIKE '%+ios@slate360.ai'
  OR NEW.email ILIKE '%+android@slate360.ai' THEN
    NEW.is_app_reviewer := true;
    NEW.account_status  := 'approved';
    NEW.is_beta_approved := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_app_reviewer ON public.profiles;
CREATE TRIGGER trg_auto_set_app_reviewer
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_app_reviewer();

-- ── Performance index ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_account_status_idx
  ON public.profiles (account_status)
  WHERE account_status = 'pending_approval';
