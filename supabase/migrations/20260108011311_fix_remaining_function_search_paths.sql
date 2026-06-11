-- Fix remaining functions with mutable search_path
-- Must use DROP + CREATE for functions with TABLE return types or parameter name changes

-- 1. get_project_folder_stats
DROP FUNCTION IF EXISTS get_project_folder_stats(uuid);
CREATE FUNCTION get_project_folder_stats(p_project_id uuid)
RETURNS TABLE(folder_path text, file_count bigint, total_size bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ff.path, '/') as folder_path,
    COUNT(uf.id) as file_count,
    COALESCE(SUM(uf.file_size), 0) as total_size
  FROM file_folders ff
  LEFT JOIN unified_files uf ON uf.folder_id = ff.id
  WHERE ff.project_id = p_project_id
  GROUP BY ff.path;
END;
$$;

-- 2. verify_share_token
DROP FUNCTION IF EXISTS verify_share_token(text);
CREATE FUNCTION verify_share_token(token_input text)
RETURNS TABLE(is_valid boolean, role text, project_id uuid, folder_id uuid, file_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_valid,
    st.role,
    st.project_id,
    st.folder_id,
    st.file_id
  FROM share_tokens st
  WHERE st.token = token_input
    AND (st.expires_at IS NULL OR st.expires_at > now());
END;
$$;

-- 3. validate_shared_token
DROP FUNCTION IF EXISTS validate_shared_token(text);
CREATE FUNCTION validate_shared_token(token_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
BEGIN
  SELECT folder_id INTO v_folder_id
  FROM share_tokens
  WHERE token = token_input
    AND (expires_at IS NULL OR expires_at > now());
  RETURN v_folder_id;
END;
$$;

-- 4. get_effective_limits
DROP FUNCTION IF EXISTS get_effective_limits(uuid);
CREATE FUNCTION get_effective_limits(p_org_id uuid)
RETURNS TABLE(storage_limit bigint, compute_limit integer, storage_used bigint, compute_used integer, storage_available bigint, compute_available integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(o.storage_limit, 10737418240)::bigint as storage_limit,
    COALESCE(o.compute_limit, 100)::integer as compute_limit,
    COALESCE(o.storage_used, 0)::bigint as storage_used,
    COALESCE(o.compute_used, 0)::integer as compute_used,
    (COALESCE(o.storage_limit, 10737418240) - COALESCE(o.storage_used, 0))::bigint as storage_available,
    (COALESCE(o.compute_limit, 100) - COALESCE(o.compute_used, 0))::integer as compute_available
  FROM organizations o
  WHERE o.id = p_org_id;
END;
$$;

-- 5. get_shared_folder
DROP FUNCTION IF EXISTS get_shared_folder(text);
CREATE FUNCTION get_shared_folder(token_input text)
RETURNS TABLE(folder_id uuid, folder_name text, folder_color text, folder_icon text, files jsonb, subfolders jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
BEGIN
  -- Get folder_id from share token
  SELECT st.folder_id INTO v_folder_id
  FROM share_tokens st
  WHERE st.token = token_input
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF v_folder_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ff.id as folder_id,
    ff.name as folder_name,
    ff.color as folder_color,
    ff.icon as folder_icon,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', uf.id,
        'name', uf.file_name,
        'size', uf.file_size,
        'type', uf.file_type
      ))
      FROM unified_files uf
      WHERE uf.folder_id = ff.id),
      '[]'::jsonb
    ) as files,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'name', sub.name
      ))
      FROM file_folders sub
      WHERE sub.parent_folder_id = ff.id),
      '[]'::jsonb
    ) as subfolders
  FROM file_folders ff
  WHERE ff.id = v_folder_id;
END;
$$;

-- 6. record_credit_usage (no return type change, just needs search_path)
CREATE OR REPLACE FUNCTION record_credit_usage(
  p_org_id uuid,
  p_amount numeric,
  p_reason text,
  p_category text,
  p_ref_type text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  INSERT INTO credit_usage (
    organization_id,
    amount,
    reason,
    category,
    reference_type,
    reference_id,
    user_id
  ) VALUES (
    p_org_id,
    p_amount,
    p_reason,
    p_category,
    p_ref_type,
    p_ref_id,
    COALESCE(p_user_id, auth.uid())
  )
  RETURNING id INTO v_usage_id;

  UPDATE organizations
  SET credits_used = COALESCE(credits_used, 0) + p_amount
  WHERE id = p_org_id;

  RETURN v_usage_id;
END;
$$;

-- 7. get_daily_upload_count (uses p_org_id)
DROP FUNCTION IF EXISTS get_daily_upload_count(uuid);
CREATE FUNCTION get_daily_upload_count(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COALESCE(upload_count, 0) INTO v_count
  FROM user_daily_uploads
  WHERE user_id = p_org_id
    AND date = CURRENT_DATE;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 8. increment_daily_upload_count (single param version)
DROP FUNCTION IF EXISTS increment_daily_upload_count(uuid);
CREATE FUNCTION increment_daily_upload_count(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_daily_uploads (user_id, date, upload_count)
  VALUES (p_org_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET upload_count = user_daily_uploads.upload_count + 1;
END;
$$;

-- 9. increment_daily_upload_count (two param version)
DROP FUNCTION IF EXISTS increment_daily_upload_count(uuid, bigint);
CREATE FUNCTION increment_daily_upload_count(p_org_id uuid, p_bytes bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO user_daily_uploads (user_id, date, upload_count, total_bytes)
  VALUES (p_org_id, CURRENT_DATE, 1, p_bytes)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    upload_count = user_daily_uploads.upload_count + 1,
    total_bytes = COALESCE(user_daily_uploads.total_bytes, 0) + p_bytes
  RETURNING upload_count INTO v_count;
  RETURN v_count;
END;
$$;;
