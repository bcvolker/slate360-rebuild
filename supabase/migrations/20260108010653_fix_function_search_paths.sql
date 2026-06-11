-- ==============================================
-- Fix function search_path security issues
-- Set explicit search_path to prevent SQL injection
-- ==============================================

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- get_daily_upload_count
CREATE OR REPLACE FUNCTION public.get_daily_upload_count(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upload_count integer;
BEGIN
  SELECT COALESCE(daily_uploads_today, 0) INTO upload_count
  FROM org_upload_limits
  WHERE org_id = p_org_id;
  RETURN COALESCE(upload_count, 0);
END;
$$;

-- update_org_seats_used
CREATE OR REPLACE FUNCTION public.update_org_seats_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organizations o
  SET seats_used = (
    SELECT COUNT(*) 
    FROM organization_members om 
    WHERE om.org_id = o.id AND om.status = 'active'
  )
  WHERE o.id = COALESCE(NEW.org_id, OLD.org_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- check_seat_availability
CREATE OR REPLACE FUNCTION public.check_seat_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_seats_max integer;
  org_seats_used integer;
BEGIN
  SELECT seats_max, seats_used INTO org_seats_max, org_seats_used
  FROM organizations
  WHERE id = NEW.org_id;
  
  IF org_seats_used >= org_seats_max THEN
    RAISE EXCEPTION 'No seats available in this organization';
  END IF;
  
  RETURN NEW;
END;
$$;

-- get_next_rfi_number
CREATE OR REPLACE FUNCTION public.get_next_rfi_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(rfi_number FROM '\d+') AS integer)), 0) + 1
  INTO next_num
  FROM rfis
  WHERE project_id = p_project_id;
  
  RETURN 'RFI-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- get_next_submittal_number
CREATE OR REPLACE FUNCTION public.get_next_submittal_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(submittal_number FROM '\d+') AS integer)), 0) + 1
  INTO next_num
  FROM submittals
  WHERE project_id = p_project_id;
  
  RETURN 'SUB-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- get_next_punch_number
CREATE OR REPLACE FUNCTION public.get_next_punch_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(item_number), 0) + 1
  INTO next_num
  FROM punch_items
  WHERE project_id = p_project_id;
  
  RETURN 'PI-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- get_next_daily_report_number
CREATE OR REPLACE FUNCTION public.get_next_daily_report_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM '\d+') AS integer)), 0) + 1
  INTO next_num
  FROM daily_reports
  WHERE project_id = p_project_id;
  
  RETURN 'DR-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- get_credit_balance - returns numeric per existing signature
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_org_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  balance numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN transaction_type IN ('purchase', 'bonus', 'refund') THEN amount
         WHEN transaction_type IN ('usage', 'adjustment') THEN -amount
         ELSE 0 END
  ), 0) INTO balance
  FROM credit_ledger
  WHERE org_id = p_org_id;
  
  RETURN balance;
END;
$$;

-- add_credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_org_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO credit_ledger (org_id, amount, transaction_type, description)
  VALUES (p_org_id, p_amount, p_transaction_type, p_description)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- get_storage_used
CREATE OR REPLACE FUNCTION public.get_storage_used(p_org_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_bytes bigint;
BEGIN
  SELECT COALESCE(SUM(file_size), 0) INTO total_bytes
  FROM project_files pf
  JOIN projects p ON pf.project_id = p.id
  WHERE p.org_id = p_org_id AND pf.deleted_at IS NULL;
  
  RETURN total_bytes;
END;
$$;

-- increment_daily_upload_count
CREATE OR REPLACE FUNCTION public.increment_daily_upload_count(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_upload_limits (org_id, daily_uploads_today, last_reset_date)
  VALUES (p_org_id, 1, CURRENT_DATE)
  ON CONFLICT (org_id) DO UPDATE SET
    daily_uploads_today = CASE 
      WHEN org_upload_limits.last_reset_date < CURRENT_DATE THEN 1
      ELSE org_upload_limits.daily_uploads_today + 1
    END,
    last_reset_date = CURRENT_DATE;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$;

-- log_project_activity
CREATE OR REPLACE FUNCTION public.log_project_activity(
  p_project_id uuid,
  p_action text,
  p_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO project_activity (project_id, action, user_id, details)
  VALUES (p_project_id, p_action, p_user_id, p_details)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;;
