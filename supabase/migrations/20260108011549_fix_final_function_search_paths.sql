-- Fix remaining 15 functions with mutable search_path
-- Drop and recreate functions with TABLE returns or changed params

-- 1. add_credits (4-param version)
DROP FUNCTION IF EXISTS add_credits(uuid, integer, text, text);
CREATE FUNCTION add_credits(p_org_id uuid, p_amount integer, p_transaction_type text, p_description text)
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

-- 2. add_credits (7-param version)
DROP FUNCTION IF EXISTS add_credits(uuid, numeric, text, text, text, uuid, uuid);
CREATE FUNCTION add_credits(p_org_id uuid, p_amount numeric, p_reason text, p_category text, p_ref_type text, p_ref_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  INSERT INTO credit_ledger (
    organization_id, delta, reason, category, ref_type, ref_id, created_by
  ) VALUES (
    p_org_id, ABS(p_amount), p_reason, p_category, p_ref_type, p_ref_id, p_user_id
  )
  RETURNING id INTO v_ledger_id;
  RETURN v_ledger_id;
END;
$$;

-- 3. add_numbers (simple test function)
DROP FUNCTION IF EXISTS add_numbers(integer, integer);
CREATE FUNCTION add_numbers(a integer, b integer)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
SELECT a + b
$$;

-- 4. add_purchased_credits
DROP FUNCTION IF EXISTS add_purchased_credits(uuid, integer, bigint);
CREATE FUNCTION add_purchased_credits(p_org_id uuid, p_compute_units integer, p_storage_bytes bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_usage (org_id, extra_compute_units, extra_storage_bytes)
  VALUES (p_org_id, p_compute_units, p_storage_bytes)
  ON CONFLICT (org_id) DO UPDATE SET
    extra_compute_units = org_usage.extra_compute_units + p_compute_units,
    extra_storage_bytes = org_usage.extra_storage_bytes + p_storage_bytes,
    updated_at = NOW();
END;
$$;

-- 5. basic_test
DROP FUNCTION IF EXISTS basic_test(text);
CREATE FUNCTION basic_test(input_val text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN input_val;
END;
$$;

-- 6. check_seat_availability (trigger version)
DROP FUNCTION IF EXISTS check_seat_availability() CASCADE;
CREATE FUNCTION check_seat_availability()
RETURNS trigger
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

-- Recreate trigger for check_seat_availability if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organization_members' AND schemaname = 'public') THEN
    DROP TRIGGER IF EXISTS check_seats_before_insert ON organization_members;
    CREATE TRIGGER check_seats_before_insert
      BEFORE INSERT ON organization_members
      FOR EACH ROW
      EXECUTE FUNCTION check_seat_availability();
  END IF;
END $$;

-- 7. check_seat_availability (function version)
DROP FUNCTION IF EXISTS check_seat_availability(uuid);
CREATE FUNCTION check_seat_availability(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchased INTEGER;
  v_used INTEGER;
  v_pending INTEGER;
BEGIN
  SELECT seats_purchased, seats_used INTO v_purchased, v_used
  FROM organizations WHERE id = p_org_id;
  
  SELECT COUNT(*) INTO v_pending
  FROM org_invites 
  WHERE org_id = p_org_id AND status = 'pending';
  
  RETURN (v_used + v_pending) < v_purchased;
END;
$$;

-- 8. check_stakeholder_folder_permission
DROP FUNCTION IF EXISTS check_stakeholder_folder_permission(text, uuid, text);
CREATE FUNCTION check_stakeholder_folder_permission(p_stakeholder_email text, p_folder_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM project_stakeholders
    WHERE email = p_stakeholder_email
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT
    CASE p_permission
      WHEN 'view' THEN can_view
      WHEN 'upload' THEN can_upload
      WHEN 'download' THEN can_download
      WHEN 'delete' THEN can_delete
      WHEN 'rename' THEN can_rename
      WHEN 'create_subfolders' THEN can_create_subfolders
      ELSE FALSE
    END INTO has_permission
  FROM folder_permissions fp
  JOIN project_stakeholders ps ON ps.id = fp.stakeholder_id
  WHERE ps.email = p_stakeholder_email
  AND fp.folder_id = p_folder_id;

  RETURN COALESCE(has_permission, FALSE);
END;
$$;

-- 9. create_default_enterprise_roles
DROP FUNCTION IF EXISTS create_default_enterprise_roles(uuid);
CREATE FUNCTION create_default_enterprise_roles(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_roles (org_id, name, description, is_system_role, permissions, can_manage_billing, can_manage_seats, can_manage_sso, can_view_financials, can_view_analytics, can_manage_projects, can_manage_team)
  VALUES (p_org_id, 'Owner', 'Full organization access', true, 
    '["org:read", "org:update", "org:manage_billing", "org:manage_sso", "org:manage_branding", "members:read", "members:invite", "members:update", "members:deactivate", "members:assign_roles", "teams:read", "teams:create", "teams:update", "teams:delete", "teams:manage_members", "roles:read", "roles:create", "roles:update", "roles:delete", "projects:read_all", "projects:create", "projects:update_all", "projects:delete", "projects:assign_team", "analytics:read_org", "analytics:read_all_projects", "analytics:export"]'::jsonb,
    true, true, true, true, true, true, true)
  ON CONFLICT (org_id, name) DO NOTHING;
  
  INSERT INTO org_roles (org_id, name, description, is_system_role, permissions, can_manage_billing, can_manage_seats, can_manage_sso, can_view_financials, can_view_analytics, can_manage_projects, can_manage_team)
  VALUES (p_org_id, 'Admin', 'Manages organization settings and members', true, 
    '["org:read", "org:update", "members:read", "members:invite", "members:update", "members:assign_roles", "teams:read", "teams:create", "teams:update", "teams:manage_members", "roles:read", "projects:read_all", "projects:create", "projects:assign_team", "analytics:read_org", "analytics:read_all_projects"]'::jsonb,
    false, true, false, true, true, true, true)
  ON CONFLICT (org_id, name) DO NOTHING;
  
  INSERT INTO org_roles (org_id, name, description, is_default, permissions, can_view_financials, can_view_analytics, can_manage_projects)
  VALUES (p_org_id, 'Project Manager', 'Manages projects and team assignments', true, 
    '["members:read", "teams:read", "projects:read_all", "projects:create", "projects:update_all", "projects:assign_team", "analytics:read_all_projects"]'::jsonb,
    true, true, true)
  ON CONFLICT (org_id, name) DO NOTHING;
  
  INSERT INTO org_roles (org_id, name, description, permissions, can_view_analytics)
  VALUES (p_org_id, 'Team Member', 'Standard access to assigned projects', 
    '["members:read", "teams:read", "projects:read_all"]'::jsonb,
    true)
  ON CONFLICT (org_id, name) DO NOTHING;
  
  INSERT INTO org_roles (org_id, name, description, permissions, can_view_analytics)
  VALUES (p_org_id, 'Viewer', 'Read-only access to assigned projects', 
    '["projects:read_all", "analytics:read_all_projects"]'::jsonb,
    true)
  ON CONFLICT (org_id, name) DO NOTHING;
END;
$$;

-- 10. generate_invitation_token
DROP FUNCTION IF EXISTS generate_invitation_token();
CREATE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    token := encode(gen_random_bytes(16), 'base64url');
    SELECT COUNT(*) INTO exists_count
    FROM stakeholder_invitations
    WHERE stakeholder_invitations.token = token;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN token;
END;
$$;

-- 11. generate_stakeholder_token
DROP FUNCTION IF EXISTS generate_stakeholder_token();
CREATE FUNCTION generate_stakeholder_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    token := encode(gen_random_bytes(24), 'base64url');
    SELECT COUNT(*) INTO exists_count
    FROM project_stakeholders
    WHERE access_token = token;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN token;
END;
$$;

-- 12. get_user_org_permissions
DROP FUNCTION IF EXISTS get_user_org_permissions(uuid, uuid);
CREATE FUNCTION get_user_org_permissions(p_user_id uuid, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions JSONB;
  v_role_record RECORD;
BEGIN
  SELECT r.* INTO v_role_record
  FROM organization_members om
  JOIN org_roles r ON om.org_role_id = r.id
  WHERE om.user_id = p_user_id AND om.org_id = p_org_id AND om.status = 'active';
  
  IF v_role_record IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  RETURN jsonb_build_object(
    'role_id', v_role_record.id,
    'role_name', v_role_record.name,
    'permissions', v_role_record.permissions,
    'can_manage_billing', v_role_record.can_manage_billing,
    'can_manage_seats', v_role_record.can_manage_seats,
    'can_manage_sso', v_role_record.can_manage_sso,
    'can_view_financials', v_role_record.can_view_financials,
    'can_view_analytics', v_role_record.can_view_analytics,
    'can_manage_projects', v_role_record.can_manage_projects,
    'can_manage_team', v_role_record.can_manage_team
  );
END;
$$;

-- 13. log_project_activity (4-param version)
DROP FUNCTION IF EXISTS log_project_activity(uuid, text, uuid, jsonb);
CREATE FUNCTION log_project_activity(p_project_id uuid, p_action text, p_user_id uuid, p_details jsonb)
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
$$;

-- 14. log_project_activity (8-param version)
DROP FUNCTION IF EXISTS log_project_activity(uuid, uuid, uuid, text, text, text, jsonb, text);
CREATE FUNCTION log_project_activity(p_org_id uuid, p_project_id uuid, p_user_id uuid, p_type text, p_title text, p_description text, p_metadata jsonb, p_severity text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO project_activity (
    org_id, project_id, user_id, type, title, description, metadata, severity
  ) VALUES (
    p_org_id, p_project_id, p_user_id, p_type, p_title, p_description, p_metadata, p_severity
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 15. log_stakeholder_activity
DROP FUNCTION IF EXISTS log_stakeholder_activity(text, uuid, text, text, text, text, jsonb);
CREATE FUNCTION log_stakeholder_activity(p_stakeholder_email text, p_project_id uuid, p_action text, p_resource_type text, p_resource_id text, p_resource_name text, p_metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO stakeholder_activity (
    stakeholder_id,
    project_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    metadata
  )
  SELECT
    ps.id,
    p_project_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_metadata
  FROM project_stakeholders ps
  WHERE ps.email = p_stakeholder_email
  AND ps.project_id = p_project_id
  AND ps.is_active = true;
END;
$$;

-- 16. record_usage_event
DROP FUNCTION IF EXISTS record_usage_event(uuid, uuid, text, bigint, integer, bigint, text, uuid, text);
CREATE FUNCTION record_usage_event(p_org_id uuid, p_user_id uuid, p_event_type text, p_storage_delta bigint, p_compute_delta integer, p_bandwidth_delta bigint, p_resource_type text, p_resource_id uuid, p_description text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO org_usage_events (
    org_id, user_id, event_type,
    storage_bytes_delta, compute_units_delta, bandwidth_bytes_delta,
    resource_type, resource_id, description
  ) VALUES (
    p_org_id, p_user_id, p_event_type,
    p_storage_delta, p_compute_delta, p_bandwidth_delta,
    p_resource_type, p_resource_id, p_description
  ) RETURNING id INTO v_event_id;
  
  INSERT INTO org_usage (org_id, storage_bytes_used, compute_units_used, bandwidth_bytes_used)
  VALUES (p_org_id, GREATEST(0, p_storage_delta), GREATEST(0, p_compute_delta), GREATEST(0, p_bandwidth_delta))
  ON CONFLICT (org_id) DO UPDATE SET
    storage_bytes_used = GREATEST(0, org_usage.storage_bytes_used + p_storage_delta),
    compute_units_used = GREATEST(0, org_usage.compute_units_used + p_compute_delta),
    bandwidth_bytes_used = GREATEST(0, org_usage.bandwidth_bytes_used + p_bandwidth_delta),
    updated_at = NOW();
  
  RETURN v_event_id;
END;
$$;

-- 17. set_invitation_token - use CASCADE to drop dependent trigger
DROP FUNCTION IF EXISTS set_invitation_token() CASCADE;
CREATE FUNCTION set_invitation_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token IS NULL THEN
    NEW.token := generate_invitation_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger for set_invitation_token
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stakeholder_invitations' AND schemaname = 'public') THEN
    CREATE TRIGGER trigger_set_invitation_token
      BEFORE INSERT ON stakeholder_invitations
      FOR EACH ROW
      EXECUTE FUNCTION set_invitation_token();
  END IF;
END $$;

-- 18. set_stakeholder_token - use CASCADE to drop dependent trigger
DROP FUNCTION IF EXISTS set_stakeholder_token() CASCADE;
CREATE FUNCTION set_stakeholder_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := generate_stakeholder_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger for set_stakeholder_token
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_stakeholders' AND schemaname = 'public') THEN
    CREATE TRIGGER trigger_set_stakeholder_token
      BEFORE INSERT ON project_stakeholders
      FOR EACH ROW
      EXECUTE FUNCTION set_stakeholder_token();
  END IF;
END $$;;
