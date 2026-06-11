-- =====================================================
-- Fix org membership trigger mismatch: seats_max -> seats_limit/seats_purchased
-- =====================================================
-- Problem:
--   Some environments have a stale trigger function on public.organization_members
--   that references organizations.seats_max (column does not exist).
--   This breaks membership inserts with SQLSTATE 42703.
--
-- Strategy:
--   1) Detect and remove only triggers/functions bound to organization_members
--      whose function body contains "seats_max".
--   2) Install canonical seat-sync and seat-limit functions using existing columns:
--      organizations.seats_limit (primary), organizations.seats_purchased (fallback).
--   3) Recreate triggers with stable names.
-- =====================================================

-- Ensure required seat columns exist (already expected in current schema).
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS seats_purchased INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seats_limit INTEGER DEFAULT 1;
-- Keep seats_limit populated for legacy org rows.
UPDATE public.organizations
SET seats_limit = COALESCE(seats_limit, seats_purchased, 1)
WHERE seats_limit IS NULL;
-- ---------------------------------------------------------------------
-- A) Remove stale organization_members triggers/functions that reference seats_max
-- ---------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      t.tgname AS trigger_name,
      n.nspname AS function_schema,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS function_args,
      pg_get_functiondef(p.oid) AS function_def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace cns ON cns.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE cns.nspname = 'public'
      AND c.relname = 'organization_members'
      AND NOT t.tgisinternal
      AND position('seats_max' in lower(pg_get_functiondef(p.oid))) > 0
  LOOP
    RAISE NOTICE 'Dropping stale trigger % on public.organization_members (function %.%(%))',
      rec.trigger_name, rec.function_schema, rec.function_name, rec.function_args;

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.organization_members', rec.trigger_name);

    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s)',
      rec.function_schema,
      rec.function_name,
      rec.function_args
    );
  END LOOP;
END $$;
-- ---------------------------------------------------------------------
-- B) Canonical function: keep organizations.seats_used synchronized
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_org_seats_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_org UUID;
  active_count INTEGER;
BEGIN
  target_org := COALESCE(NEW.org_id, OLD.org_id);

  BEGIN
    SELECT COUNT(*)::INTEGER
      INTO active_count
    FROM public.organization_members om
    WHERE om.org_id = target_org
      AND COALESCE(om.status, 'active') = 'active';
  EXCEPTION WHEN undefined_column THEN
    SELECT COUNT(*)::INTEGER
      INTO active_count
    FROM public.organization_members om
    WHERE om.org_id = target_org;
  END;

  UPDATE public.organizations
  SET seats_used = active_count,
      updated_at = NOW()
  WHERE id = target_org;

  RETURN COALESCE(NEW, OLD);
END;
$$;
-- ---------------------------------------------------------------------
-- C) Canonical function: enforce seat limit before insert/update
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_org_member_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seat_limit INTEGER;
  v_current_used INTEGER;
  v_existing_org UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Determine seat limit from existing schema.
  SELECT COALESCE(o.seats_limit, o.seats_purchased, 1)
    INTO v_seat_limit
  FROM public.organizations o
  WHERE o.id = NEW.org_id;

  -- Unlimited convention.
  IF v_seat_limit IS NULL OR v_seat_limit < 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_existing_org := OLD.org_id;

    -- If user stays in same org and already active, allow updates.
    IF v_existing_org = NEW.org_id THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    SELECT COUNT(*)::INTEGER
      INTO v_current_used
    FROM public.organization_members om
    WHERE om.org_id = NEW.org_id
      AND COALESCE(om.status, 'active') = 'active';
  EXCEPTION WHEN undefined_column THEN
    SELECT COUNT(*)::INTEGER
      INTO v_current_used
    FROM public.organization_members om
    WHERE om.org_id = NEW.org_id;
  END;

  IF v_current_used >= v_seat_limit THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'Seat limit exceeded for org %s: used=%s limit=%s',
        NEW.org_id,
        v_current_used,
        v_seat_limit
      );
  END IF;

  RETURN NEW;
END;
$$;
-- Recreate canonical triggers.
DROP TRIGGER IF EXISTS trigger_update_org_seats ON public.organization_members;
CREATE TRIGGER trigger_update_org_seats
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_seats_used();
DROP TRIGGER IF EXISTS trigger_enforce_org_member_seat_limit ON public.organization_members;
CREATE TRIGGER trigger_enforce_org_member_seat_limit
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_member_seat_limit();
-- Normalize seats_used after trigger install.
WITH counts AS (
  SELECT
    om.org_id,
    COUNT(*)::INTEGER AS used_count
  FROM public.organization_members om
  GROUP BY om.org_id
)
UPDATE public.organizations o
SET seats_used = COALESCE(c.used_count, 0),
    updated_at = NOW()
FROM counts c
WHERE o.id = c.org_id;
UPDATE public.organizations
SET seats_used = 0,
    updated_at = NOW()
WHERE id NOT IN (SELECT org_id FROM public.organization_members);
-- Helpful verification query in migration logs.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      t.tgname,
      p.proname,
      CASE WHEN position('seats_max' in lower(pg_get_functiondef(p.oid))) > 0 THEN true ELSE false END AS references_seats_max
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'organization_members'
      AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'organization_members trigger=% function=% seats_max_ref=%', rec.tgname, rec.proname, rec.references_seats_max;
  END LOOP;
END $$;
