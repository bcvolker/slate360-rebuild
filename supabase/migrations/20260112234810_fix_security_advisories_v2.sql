-- =====================================================
-- SECURITY FIXES MIGRATION v2
-- Addresses Supabase security advisor warnings
-- =====================================================

-- 1. Add RLS policy for integration_sync_logs table
-- This table has RLS enabled but no policies defined
CREATE POLICY "Users can view their own org sync logs"
ON public.integration_sync_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.organization_members om ON om.org_id = ic.org_id
    WHERE ic.id = integration_sync_logs.connection_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "Users can insert sync logs for their org connections"
ON public.integration_sync_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.organization_members om ON om.org_id = ic.org_id
    WHERE ic.id = connection_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- 2. Fix SECURITY DEFINER views using ALTER VIEW (no need to drop)
-- Note: org_credit_summary can be dropped and recreated safely
DROP VIEW IF EXISTS public.org_credit_summary;
CREATE VIEW public.org_credit_summary
WITH (security_invoker = true)
AS
SELECT 
  org_id,
  monthly_allocation,
  monthly_credits_used,
  (monthly_allocation - monthly_credits_used) AS monthly_remaining,
  purchased_balance,
  ((monthly_allocation - monthly_credits_used) + purchased_balance) AS total_available,
  monthly_reset_at,
  last_reset_at,
  updated_at
FROM credits c;

-- For private_org_members_view, we need to preserve dependencies
-- First save the policies, then recreate
-- Actually, let's just update the view options
ALTER VIEW public.private_org_members_view SET (security_invoker = true);

-- 3. Fix function search_path security issues
-- update_updated_at_column - set immutable search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- reset_monthly_credits - set immutable search path
CREATE OR REPLACE FUNCTION public.reset_monthly_credits(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE credits
  SET 
    monthly_credits_used = 0,
    monthly_reset_at = now(),
    updated_at = now()
  WHERE org_id = p_org_id;
  
  -- Log the reset in the ledger
  INSERT INTO credit_ledger (
    organization_id,
    delta,
    running_balance,
    reason,
    category,
    credit_source,
    metadata
  ) VALUES (
    p_org_id,
    0,
    (SELECT monthly_allocation - 0 + purchased_balance FROM credits WHERE org_id = p_org_id),
    'Monthly credits reset',
    'monthly_reset',
    'monthly',
    jsonb_build_object('reset_at', now()::text)
  );
END;
$$;

-- consume_credits - set immutable search path
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'Credit consumption',
  p_category TEXT DEFAULT 'processing',
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits RECORD;
  v_monthly_to_use integer;
  v_purchased_to_use integer;
  v_new_running_balance numeric;
  v_source text;
  v_monthly_available integer;
BEGIN
  SELECT * INTO v_credits
  FROM credits
  WHERE org_id = p_org_id
  FOR UPDATE;
  
  IF v_credits IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No credit record found for organization'
    );
  END IF;
  
  v_monthly_available := GREATEST(0, v_credits.monthly_allocation - v_credits.monthly_credits_used);
  
  IF p_amount <= v_monthly_available THEN
    v_monthly_to_use := p_amount;
    v_purchased_to_use := 0;
    v_source := 'monthly';
  ELSIF v_monthly_available > 0 THEN
    v_monthly_to_use := v_monthly_available;
    v_purchased_to_use := p_amount - v_monthly_available;
    v_source := 'mixed';
  ELSE
    v_monthly_to_use := 0;
    v_purchased_to_use := p_amount;
    v_source := 'purchased';
  END IF;
  
  IF v_purchased_to_use > v_credits.purchased_balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'available_monthly', v_monthly_available,
      'available_purchased', v_credits.purchased_balance,
      'required', p_amount
    );
  END IF;
  
  UPDATE credits
  SET 
    monthly_credits_used = monthly_credits_used + v_monthly_to_use,
    purchased_balance = purchased_balance - v_purchased_to_use,
    balance = balance - p_amount,
    updated_at = now()
  WHERE org_id = p_org_id;
  
  v_new_running_balance := v_credits.balance - p_amount;
  
  INSERT INTO credit_ledger (
    organization_id,
    delta,
    running_balance,
    reason,
    category,
    ref_type,
    ref_id,
    credit_source,
    metadata
  ) VALUES (
    p_org_id,
    -p_amount,
    v_new_running_balance,
    p_reason,
    p_category,
    p_ref_type,
    p_ref_id,
    v_source,
    p_metadata || jsonb_build_object(
      'monthly_used', v_monthly_to_use,
      'purchased_used', v_purchased_to_use
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'monthly_used', v_monthly_to_use,
    'purchased_used', v_purchased_to_use,
    'source', v_source,
    'new_balance', v_new_running_balance
  );
END;
$$;

-- add_purchased_credits - set immutable search path
CREATE OR REPLACE FUNCTION public.add_purchased_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'Credit purchase',
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_new_purchased integer;
BEGIN
  UPDATE credits
  SET 
    purchased_balance = purchased_balance + p_amount,
    balance = balance + p_amount,
    updated_at = now()
  WHERE org_id = p_org_id
  RETURNING balance, purchased_balance INTO v_new_balance, v_new_purchased;
  
  IF v_new_balance IS NULL THEN
    INSERT INTO credits (org_id, purchased_balance, balance)
    VALUES (p_org_id, p_amount, p_amount)
    RETURNING balance, purchased_balance INTO v_new_balance, v_new_purchased;
  END IF;
  
  INSERT INTO credit_ledger (
    organization_id,
    delta,
    running_balance,
    reason,
    category,
    ref_type,
    ref_id,
    credit_source,
    metadata
  ) VALUES (
    p_org_id,
    p_amount,
    v_new_balance,
    p_reason,
    'credit_purchase',
    p_ref_type,
    p_ref_id,
    'purchased',
    p_metadata
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'purchased_balance', v_new_purchased,
    'total_balance', v_new_balance
  );
END;
$$;

-- get_credit_breakdown - set immutable search path
CREATE OR REPLACE FUNCTION public.get_credit_breakdown(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits RECORD;
BEGIN
  SELECT * INTO v_credits
  FROM credits
  WHERE org_id = p_org_id;
  
  IF v_credits IS NULL THEN
    RETURN jsonb_build_object(
      'monthly_allocation', 0,
      'monthly_used', 0,
      'monthly_remaining', 0,
      'purchased_balance', 0,
      'total_available', 0,
      'days_until_reset', 30
    );
  END IF;
  
  RETURN jsonb_build_object(
    'monthly_allocation', v_credits.monthly_allocation,
    'monthly_used', v_credits.monthly_credits_used,
    'monthly_remaining', GREATEST(0, v_credits.monthly_allocation - v_credits.monthly_credits_used),
    'purchased_balance', v_credits.purchased_balance,
    'total_available', GREATEST(0, v_credits.monthly_allocation - v_credits.monthly_credits_used) + v_credits.purchased_balance,
    'days_until_reset', GREATEST(0, EXTRACT(DAY FROM (v_credits.monthly_reset_at + interval '30 days' - now())))::integer,
    'last_reset', v_credits.monthly_reset_at
  );
END;
$$;;
