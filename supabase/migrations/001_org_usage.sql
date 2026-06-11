-- =====================================================
-- ORG USAGE TRACKING MIGRATION
-- Adds data usage tracking (storage + compute + bandwidth)
-- Run after main schema.sql
-- =====================================================

-- =====================================================
-- 1. ORG USAGE TABLE
-- Current usage snapshot for each organization
-- =====================================================
CREATE TABLE IF NOT EXISTS public.org_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Storage tracking (in bytes)
  storage_bytes_used BIGINT DEFAULT 0,
  storage_bytes_limit BIGINT DEFAULT 524288000, -- 500MB default (trial)
  
  -- Compute units (abstract units for processing jobs)
  compute_units_used INTEGER DEFAULT 0,
  compute_units_limit INTEGER DEFAULT 100, -- 100 units default (trial)
  
  -- Bandwidth tracking (in bytes)
  bandwidth_bytes_used BIGINT DEFAULT 0,
  bandwidth_bytes_limit BIGINT DEFAULT 5368709120, -- 5GB default
  
  -- Extra purchased credits/storage
  extra_storage_bytes BIGINT DEFAULT 0,
  extra_compute_units INTEGER DEFAULT 0,
  
  -- Reset tracking (for monthly limits)
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. ORG USAGE EVENTS TABLE
-- Fine-grained history of usage events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.org_usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  
  -- Event type
  event_type TEXT NOT NULL, -- 'storage_add', 'storage_remove', 'compute', 'bandwidth', 'credit_purchase'
  
  -- Usage values
  storage_bytes_delta BIGINT DEFAULT 0, -- Positive for add, negative for remove
  compute_units_delta INTEGER DEFAULT 0,
  bandwidth_bytes_delta BIGINT DEFAULT 0,
  
  -- Resource reference
  resource_type TEXT, -- 'asset', 'project', 'render', 'export', etc.
  resource_id UUID,
  resource_name TEXT,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. CREDIT PACKS TABLE
-- Purchasable credit packages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- What you get
  compute_units INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  
  -- Pricing
  price_cents INTEGER NOT NULL, -- Price in cents
  stripe_price_id TEXT,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default credit packs
INSERT INTO public.credit_packs (name, description, compute_units, storage_bytes, price_cents, display_order, is_popular) VALUES
  ('Starter Pack', '100 compute units + 5GB storage', 100, 5368709120, 999, 1, false),
  ('Pro Pack', '500 compute units + 25GB storage', 500, 26843545600, 3999, 2, true),
  ('Enterprise Pack', '2000 compute units + 100GB storage', 2000, 107374182400, 9999, 3, false)
ON CONFLICT DO NOTHING;
-- =====================================================
-- 4. CREDIT PURCHASES TABLE
-- Track credit pack purchases
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id), -- Who purchased
  
  -- What was purchased
  credit_pack_id UUID REFERENCES public.credit_packs(id),
  compute_units INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  
  -- Payment info
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_org_usage_org_id ON public.org_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_events_org_id ON public.org_usage_events(org_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_events_created_at ON public.org_usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_org_usage_events_event_type ON public.org_usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_org_id ON public.credit_purchases(org_id);
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.org_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "Members can view org usage" ON public.org_usage;
DROP POLICY IF EXISTS "Members can view org usage events" ON public.org_usage_events;
DROP POLICY IF EXISTS "Anyone can view credit packs" ON public.credit_packs;
DROP POLICY IF EXISTS "Members can view org purchases" ON public.credit_purchases;
-- Org usage: Members can view their org's usage
CREATE POLICY "Members can view org usage" ON public.org_usage
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Org usage events: Members can view their org's events
CREATE POLICY "Members can view org usage events" ON public.org_usage_events
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Credit packs: Anyone can view active packs
CREATE POLICY "Anyone can view credit packs" ON public.credit_packs
  FOR SELECT USING (is_active = true);
-- Credit purchases: Members can view their org's purchases
CREATE POLICY "Members can view org purchases" ON public.credit_purchases
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Drop existing trigger first (safe to run multiple times)
DROP TRIGGER IF EXISTS update_org_usage_updated_at ON public.org_usage;
-- Function to update org_usage.updated_at
CREATE TRIGGER update_org_usage_updated_at
  BEFORE UPDATE ON public.org_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to record usage and update totals
CREATE OR REPLACE FUNCTION record_usage_event(
  p_org_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_storage_delta BIGINT DEFAULT 0,
  p_compute_delta INTEGER DEFAULT 0,
  p_bandwidth_delta BIGINT DEFAULT 0,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert the event
  INSERT INTO public.org_usage_events (
    org_id, user_id, event_type,
    storage_bytes_delta, compute_units_delta, bandwidth_bytes_delta,
    resource_type, resource_id, description
  ) VALUES (
    p_org_id, p_user_id, p_event_type,
    p_storage_delta, p_compute_delta, p_bandwidth_delta,
    p_resource_type, p_resource_id, p_description
  ) RETURNING id INTO v_event_id;
  
  -- Update the usage totals
  INSERT INTO public.org_usage (org_id, storage_bytes_used, compute_units_used, bandwidth_bytes_used)
  VALUES (p_org_id, GREATEST(0, p_storage_delta), GREATEST(0, p_compute_delta), GREATEST(0, p_bandwidth_delta))
  ON CONFLICT (org_id) DO UPDATE SET
    storage_bytes_used = GREATEST(0, public.org_usage.storage_bytes_used + p_storage_delta),
    compute_units_used = GREATEST(0, public.org_usage.compute_units_used + p_compute_delta),
    bandwidth_bytes_used = GREATEST(0, public.org_usage.bandwidth_bytes_used + p_bandwidth_delta),
    updated_at = NOW();
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to add purchased credits to org
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_org_id UUID,
  p_compute_units INTEGER,
  p_storage_bytes BIGINT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.org_usage (org_id, extra_compute_units, extra_storage_bytes)
  VALUES (p_org_id, p_compute_units, p_storage_bytes)
  ON CONFLICT (org_id) DO UPDATE SET
    extra_compute_units = public.org_usage.extra_compute_units + p_compute_units,
    extra_storage_bytes = public.org_usage.extra_storage_bytes + p_storage_bytes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get effective limits (base + extra)
CREATE OR REPLACE FUNCTION get_effective_limits(p_org_id UUID)
RETURNS TABLE (
  storage_limit BIGINT,
  compute_limit INTEGER,
  storage_used BIGINT,
  compute_used INTEGER,
  storage_available BIGINT,
  compute_available INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (ou.storage_bytes_limit + ou.extra_storage_bytes) AS storage_limit,
    (ou.compute_units_limit + ou.extra_compute_units) AS compute_limit,
    ou.storage_bytes_used AS storage_used,
    ou.compute_units_used AS compute_used,
    GREATEST(0, (ou.storage_bytes_limit + ou.extra_storage_bytes) - ou.storage_bytes_used) AS storage_available,
    GREATEST(0, (ou.compute_units_limit + ou.extra_compute_units) - ou.compute_units_used) AS compute_available
  FROM public.org_usage ou
  WHERE ou.org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute on functions
GRANT EXECUTE ON FUNCTION record_usage_event TO authenticated;
GRANT EXECUTE ON FUNCTION add_purchased_credits TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_limits TO authenticated;
-- =====================================================
-- DONE! Usage tracking tables are ready.
-- =====================================================;
