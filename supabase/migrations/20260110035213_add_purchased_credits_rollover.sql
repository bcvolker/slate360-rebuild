
-- Migration: Add purchased credits with rollover support
-- Credits are now split into:
--   monthly_credits_used: resets each billing cycle
--   purchased_balance: never expires, carries over indefinitely

-- Add purchased_balance column to track rollover credits
ALTER TABLE credits 
ADD COLUMN IF NOT EXISTS purchased_balance integer NOT NULL DEFAULT 0;

-- Add monthly_credits_used to track monthly allocation consumption (resets each period)
ALTER TABLE credits 
ADD COLUMN IF NOT EXISTS monthly_credits_used integer NOT NULL DEFAULT 0;

-- Add column to track when monthly credits were last reset
ALTER TABLE credits 
ADD COLUMN IF NOT EXISTS monthly_reset_at timestamptz DEFAULT now();

-- Add credit_source column to credit_ledger to track where credits came from
ALTER TABLE credit_ledger 
ADD COLUMN IF NOT EXISTS credit_source text DEFAULT 'monthly' 
CHECK (credit_source IN ('monthly', 'purchased', 'bonus', 'refund', 'mixed'));

-- Create index for efficient credit source queries
CREATE INDEX IF NOT EXISTS idx_credit_ledger_source 
ON credit_ledger(organization_id, credit_source, created_at DESC);

-- Create a view that shows the breakdown of credits for each organization
CREATE OR REPLACE VIEW org_credit_summary AS
SELECT 
  c.org_id,
  c.monthly_allocation,
  c.monthly_credits_used,
  (c.monthly_allocation - c.monthly_credits_used) as monthly_remaining,
  c.purchased_balance,
  (c.monthly_allocation - c.monthly_credits_used + c.purchased_balance) as total_available,
  c.monthly_reset_at,
  c.last_reset_at,
  c.updated_at
FROM credits c;

-- Grant access to the view
GRANT SELECT ON org_credit_summary TO authenticated;

-- Function to reset monthly credits (called by cron or on subscription renewal)
CREATE OR REPLACE FUNCTION reset_monthly_credits(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to consume credits (prioritizes monthly over purchased)
CREATE OR REPLACE FUNCTION consume_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'Credit usage',
  p_category text DEFAULT 'job_usage',
  p_ref_type text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits RECORD;
  v_monthly_to_use integer;
  v_purchased_to_use integer;
  v_new_running_balance numeric;
  v_source text;
  v_monthly_available integer;
BEGIN
  -- Get current credit state
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
  
  -- Calculate available monthly credits
  v_monthly_available := GREATEST(0, v_credits.monthly_allocation - v_credits.monthly_credits_used);
  
  -- Determine how much to take from each pool
  IF p_amount <= v_monthly_available THEN
    -- All from monthly
    v_monthly_to_use := p_amount;
    v_purchased_to_use := 0;
    v_source := 'monthly';
  ELSIF v_monthly_available > 0 THEN
    -- Some from monthly, rest from purchased
    v_monthly_to_use := v_monthly_available;
    v_purchased_to_use := p_amount - v_monthly_available;
    v_source := 'mixed';
  ELSE
    -- All from purchased
    v_monthly_to_use := 0;
    v_purchased_to_use := p_amount;
    v_source := 'purchased';
  END IF;
  
  -- Check if we have enough purchased credits if needed
  IF v_purchased_to_use > v_credits.purchased_balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'available_monthly', v_monthly_available,
      'available_purchased', v_credits.purchased_balance,
      'required', p_amount
    );
  END IF;
  
  -- Update the credits
  UPDATE credits
  SET 
    monthly_credits_used = monthly_credits_used + v_monthly_to_use,
    purchased_balance = purchased_balance - v_purchased_to_use,
    balance = balance - p_amount,
    updated_at = now()
  WHERE org_id = p_org_id;
  
  -- Calculate new running balance
  v_new_running_balance := v_credits.balance - p_amount;
  
  -- Log to ledger
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

-- Function to add purchased credits (these never expire)
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'Credit purchase',
  p_ref_type text DEFAULT 'credit_purchase',
  p_ref_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
  v_new_purchased integer;
BEGIN
  -- Update purchased balance
  UPDATE credits
  SET 
    purchased_balance = purchased_balance + p_amount,
    balance = balance + p_amount,
    updated_at = now()
  WHERE org_id = p_org_id
  RETURNING balance, purchased_balance INTO v_new_balance, v_new_purchased;
  
  -- Create record if it doesn't exist
  IF v_new_balance IS NULL THEN
    INSERT INTO credits (org_id, purchased_balance, balance)
    VALUES (p_org_id, p_amount, p_amount)
    RETURNING balance, purchased_balance INTO v_new_balance, v_new_purchased;
  END IF;
  
  -- Log to ledger
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

-- RPC function to get credit breakdown for an org
CREATE OR REPLACE FUNCTION get_credit_breakdown(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reset_monthly_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION consume_credits(uuid, integer, text, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION add_purchased_credits(uuid, integer, text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_breakdown(uuid) TO authenticated;

-- Add comment explaining the credit system
COMMENT ON TABLE credits IS 'Tracks organization credit balances. 
Monthly credits (from subscription) reset each billing period.
Purchased credits never expire and carry over indefinitely.
The consume_credits function prioritizes monthly credits before purchased credits.';
;
