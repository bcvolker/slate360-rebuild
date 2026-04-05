-- Atomic seat counting for standalone app subscriptions.
--
-- Uses SELECT … FOR UPDATE to serialize concurrent seat claims.
-- Even if 100 users click "Join" at the same millisecond, the
-- seats_used counter stays mathematically accurate and never
-- exceeds the seat_limit.
--
-- Returns the new seats_used count on success.
-- Raises an exception if the org has no feature-flag row, or if
-- claiming would exceed the seat limit.
--
-- Usage (from service-role / admin client only):
--   SELECT increment_app_seat('org-uuid', 'tour_builder');
--   SELECT increment_app_seat('org-uuid', 'tour_builder', -1);  -- release

CREATE OR REPLACE FUNCTION public.increment_app_seat(
  p_org_id  uuid,
  p_app_id  text,
  p_delta   integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with table-owner privileges (service role)
SET search_path = public  -- prevent search_path injection
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
  -- EXECUTE with INTO is used because column names are dynamic.
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

  -- Guard: never go below 0 or above the limit
  IF v_new_used < 0 THEN
    RAISE EXCEPTION 'Cannot release more seats than currently used (current: %, delta: %)',
      v_current_used, p_delta
      USING ERRCODE = 'check_violation';
  END IF;

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
  'Pass delta=1 to claim, delta=-1 to release. Raises on overflow/underflow.';

-- Revoke direct access from anon/authenticated — only service role can call this.
REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_app_seat(uuid, text, integer) FROM authenticated;
