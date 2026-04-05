-- Rename punchwalk_* columns to site_walk_* in org_feature_flags.
--
-- The app was renamed from "PunchWalk" to "Site Walk" but the database
-- columns still carried the old name. This migration:
-- 1. Renames the two seat columns
-- 2. Rebuilds the cleanup trigger to reference the new column names
-- 3. Adds site_walk support to increment_app_seat function

-- ══════════════════════════════════════════════════════════════
-- 1. Rename columns
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.org_feature_flags
  RENAME COLUMN punchwalk_seat_limit  TO site_walk_seat_limit;

ALTER TABLE public.org_feature_flags
  RENAME COLUMN punchwalk_seats_used  TO site_walk_seats_used;

-- ══════════════════════════════════════════════════════════════
-- 2. Rebuild trigger function with new column names
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

  -- Site Walk: seat limit drops to 0 from a positive value
  IF (OLD.site_walk_seat_limit > 0 AND NEW.site_walk_seat_limit = 0) THEN
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
-- 3. Add site_walk support to increment_app_seat
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_app_seat(
  p_org_id  uuid,
  p_app_id  text,
  p_delta   integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_used  integer;
  v_limit         integer;
  v_new_used      integer;
  v_col_used      text;
  v_col_limit     text;
BEGIN
  -- Resolve column names from app_id
  IF p_app_id = 'tour_builder' THEN
    v_col_used  := 'tour_builder_seats_used';
    v_col_limit := 'tour_builder_seat_limit';
  ELSIF p_app_id = 'site_walk' THEN
    v_col_used  := 'site_walk_seats_used';
    v_col_limit := 'site_walk_seat_limit';
  ELSE
    RAISE EXCEPTION 'Unknown app_id: %', p_app_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  EXECUTE format(
    'SELECT %I, %I FROM org_feature_flags WHERE org_id = $1 FOR UPDATE',
    v_col_used, v_col_limit
  )
  INTO v_current_used, v_limit
  USING p_org_id;

  IF v_current_used IS NULL THEN
    RAISE EXCEPTION 'No feature-flag row for org %', p_org_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_new_used := v_current_used + p_delta;

  -- Soft-fail: clamp to 0 instead of crashing on over-release
  IF v_new_used < 0 THEN
    RAISE WARNING 'Seat release clamped to 0 (org: %, app: %, current: %, delta: %)',
      p_org_id, p_app_id, v_current_used, p_delta;
    v_new_used := 0;
  END IF;

  -- Hard-fail: over-provisioning is not allowed
  IF v_new_used > v_limit THEN
    RAISE EXCEPTION 'Seat limit exceeded (limit: %, current: %, requested delta: %)',
      v_limit, v_current_used, p_delta
      USING ERRCODE = 'check_violation';
  END IF;

  EXECUTE format(
    'UPDATE org_feature_flags SET %I = $1 WHERE org_id = $2',
    v_col_used
  )
  USING v_new_used, p_org_id;

  RETURN v_new_used;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM authenticated;
