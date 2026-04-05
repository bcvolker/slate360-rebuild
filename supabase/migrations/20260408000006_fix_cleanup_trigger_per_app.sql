-- Fix: Rewrite deliverable cleanup trigger to evaluate org_feature_flags
-- per-app seat limits instead of the global organizations.tier column.
--
-- The Walled Garden model means each app can be independently provisioned
-- or de-provisioned. A churn event is when an app's seat_limit drops to 0,
-- NOT when the global tier changes.
--
-- This migration:
-- 1. Adds punchwalk seat columns to org_feature_flags (parity with tour_builder)
-- 2. Adds app_id column to deliverable_cleanup_queue
-- 3. Replaces the old trigger with a new one on org_feature_flags
-- 4. Drops the old trigger from organizations

-- ══════════════════════════════════════════════════════════════
-- 1. Add punchwalk (site_walk) seat columns to org_feature_flags
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.org_feature_flags
  ADD COLUMN IF NOT EXISTS punchwalk_seat_limit  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS punchwalk_seats_used  integer NOT NULL DEFAULT 0;

-- ══════════════════════════════════════════════════════════════
-- 2. Add app_id to cleanup queue so workers know which app churned
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.deliverable_cleanup_queue
  ADD COLUMN IF NOT EXISTS app_id text;

-- Drop old columns that assumed global-tier model
-- (old_tier / new_tier are no longer meaningful — keep them nullable for
--  existing rows but new rows will use app_id instead)
ALTER TABLE public.deliverable_cleanup_queue
  ALTER COLUMN old_tier DROP NOT NULL,
  ALTER COLUMN new_tier DROP NOT NULL,
  ALTER COLUMN new_tier DROP DEFAULT;

-- ══════════════════════════════════════════════════════════════
-- 3. Drop the old tier-based trigger from organizations
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_org_tier_downgrade ON public.organizations;

-- ══════════════════════════════════════════════════════════════
-- 4. New trigger function — per-app seat limit evaluation
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_enqueue_deliverable_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tour Builder: seat limit drops to 0 from a positive value
  IF (OLD.tour_builder_seat_limit > 0 AND NEW.tour_builder_seat_limit = 0) THEN
    INSERT INTO deliverable_cleanup_queue (org_id, app_id, status)
    VALUES (NEW.org_id, 'tour_builder', 'pending');
  END IF;

  -- Site Walk (punchwalk): seat limit drops to 0 from a positive value
  IF (OLD.punchwalk_seat_limit > 0 AND NEW.punchwalk_seat_limit = 0) THEN
    INSERT INTO deliverable_cleanup_queue (org_id, app_id, status)
    VALUES (NEW.org_id, 'site_walk', 'pending');
  END IF;

  -- Standalone boolean flags: standalone app disabled
  IF (OLD.standalone_tour_builder IS TRUE AND NEW.standalone_tour_builder IS FALSE) THEN
    INSERT INTO deliverable_cleanup_queue (org_id, app_id, status)
    VALUES (NEW.org_id, 'tour_builder', 'pending');
  END IF;

  IF (OLD.standalone_punchwalk IS TRUE AND NEW.standalone_punchwalk IS FALSE) THEN
    INSERT INTO deliverable_cleanup_queue (org_id, app_id, status)
    VALUES (NEW.org_id, 'site_walk', 'pending');
  END IF;

  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 5. Attach new trigger to org_feature_flags
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_app_churn ON public.org_feature_flags;

CREATE TRIGGER on_app_churn
  AFTER UPDATE ON public.org_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_deliverable_cleanup();

COMMENT ON FUNCTION public.trg_enqueue_deliverable_cleanup IS
  'Enqueues per-app cleanup when an app''s seat_limit drops to 0 or '
  'its standalone flag is set to false. Evaluates each app independently.';
