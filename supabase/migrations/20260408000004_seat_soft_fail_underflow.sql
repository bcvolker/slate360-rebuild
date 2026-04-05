-- Refine increment_app_seat: soft-fail on decrement below 0.
--
-- Previously, releasing a seat when seats_used = 0 raised an EXCEPTION,
-- which crashes the calling code and rolls back the transaction.
--
-- New behavior: if delta would push count below 0, clamp to 0, log a
-- WARNING, and return 0. The caller gets a clean return value and can
-- decide how to surface the info.
--
-- Overflow (above limit) still raises a hard exception because
-- over-provisioning is a business-rule violation.

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
  ELSE
    RAISE EXCEPTION 'Unknown app_id: %', p_app_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lock the row exclusively to serialize concurrent seat claims.
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

  -- Apply the atomic update
  EXECUTE format(
    'UPDATE org_feature_flags SET %I = $1 WHERE org_id = $2',
    v_col_used
  )
  USING v_new_used, p_org_id;

  RETURN v_new_used;
END;
$$;

COMMENT ON FUNCTION public.increment_app_seat IS
  'Atomically claim or release an app seat using row-level locking. '
  'Pass delta=1 to claim, delta=-1 to release. Hard-fails on overflow; '
  'soft-fails (clamps to 0) on underflow.';

-- Revoke direct access from anon/authenticated — only service role can call this.
REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM authenticated;
