-- =====================================================
-- BUDGET MANAGEMENT TABLES
-- WBS-compatible budget with versioning, line items, and change orders
-- Run after main schema.sql
-- =====================================================

-- =====================================================
-- 1. BUDGET VERSIONS TABLE
-- Tracks different budget versions (original, revised, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Version info
  name TEXT NOT NULL DEFAULT 'Original Budget',
  description TEXT,
  version_number INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT false, -- Only one active version per project
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'locked', 'archived'
  
  -- Totals (denormalized for performance)
  total_original_budget DECIMAL(15, 2) DEFAULT 0,
  total_revised_budget DECIMAL(15, 2) DEFAULT 0,
  total_committed DECIMAL(15, 2) DEFAULT 0,
  total_actual DECIMAL(15, 2) DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. BUDGET LINE ITEMS TABLE
-- Individual cost codes / WBS items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- WBS Structure
  parent_id UUID REFERENCES public.budget_line_items(id) ON DELETE CASCADE,
  wbs_code TEXT NOT NULL, -- e.g., "01", "01.01", "01.01.001"
  cost_code TEXT, -- CSI code if applicable
  
  -- Description
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'division', 'subdivision', 'line_item'
  
  -- Budget amounts
  original_budget DECIMAL(15, 2) DEFAULT 0,
  revised_budget DECIMAL(15, 2) DEFAULT 0, -- Original + approved change orders
  
  -- Actuals
  committed DECIMAL(15, 2) DEFAULT 0, -- Purchase orders, contracts
  actual DECIMAL(15, 2) DEFAULT 0, -- Invoiced/paid
  
  -- Forecast
  projected_final DECIMAL(15, 2) DEFAULT 0, -- Expected final cost
  variance DECIMAL(15, 2) DEFAULT 0, -- projected_final - revised_budget
  
  -- Units (optional for detailed tracking)
  unit TEXT, -- 'SF', 'LF', 'EA', 'LS', etc.
  quantity DECIMAL(12, 4),
  unit_cost DECIMAL(12, 4),
  
  -- Status
  is_locked BOOLEAN DEFAULT false,
  is_expanded BOOLEAN DEFAULT true, -- UI state
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0, -- Nesting depth
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. CHANGE ORDERS TABLE
-- Budget modifications requiring approval
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES public.budget_line_items(id) ON DELETE SET NULL,
  
  -- Change order info
  co_number TEXT NOT NULL, -- e.g., "CO-001"
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT, -- 'scope_change', 'design_change', 'unforeseen', 'owner_request', 'error_correction'
  
  -- Amounts
  amount DECIMAL(15, 2) NOT NULL,
  previous_budget DECIMAL(15, 2),
  new_budget DECIMAL(15, 2),
  
  -- Approval workflow
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'void'
  submitted_by UUID REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- References
  reference_number TEXT, -- External reference (e.g., architect's CO#)
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file references
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 4. BUDGET COMMITMENTS TABLE
-- Purchase orders, contracts, subcontracts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES public.budget_line_items(id) ON DELETE SET NULL,
  
  -- Commitment info
  commitment_number TEXT, -- PO#, Contract#
  commitment_type TEXT DEFAULT 'purchase_order', -- 'purchase_order', 'subcontract', 'service_agreement'
  vendor_name TEXT,
  vendor_id UUID, -- Future: link to vendors table
  
  -- Amounts
  original_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2), -- After modifications
  invoiced_amount DECIMAL(15, 2) DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'draft', 'active', 'complete', 'void'
  
  -- Dates
  issue_date DATE,
  due_date DATE,
  completion_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_budget_versions_project ON public.budget_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_active ON public.budget_versions(project_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_budget_line_items_version ON public.budget_line_items(version_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_parent ON public.budget_line_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_wbs ON public.budget_line_items(version_id, wbs_code);
CREATE INDEX IF NOT EXISTS idx_budget_change_orders_project ON public.budget_change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_change_orders_status ON public.budget_change_orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_budget_commitments_project ON public.budget_commitments(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_commitments_line_item ON public.budget_commitments(line_item_id);
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_commitments ENABLE ROW LEVEL SECURITY;
-- Budget versions: Members can view their org's budget versions
DROP POLICY IF EXISTS "Members can view org budget versions" ON public.budget_versions;
CREATE POLICY "Members can view org budget versions" ON public.budget_versions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage org budget versions" ON public.budget_versions;
CREATE POLICY "Members can manage org budget versions" ON public.budget_versions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );
-- Budget line items: Via version's org
DROP POLICY IF EXISTS "Members can view budget line items" ON public.budget_line_items;
CREATE POLICY "Members can view budget line items" ON public.budget_line_items
  FOR SELECT USING (
    version_id IN (
      SELECT bv.id FROM public.budget_versions bv
      JOIN public.organization_members om ON bv.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage budget line items" ON public.budget_line_items;
CREATE POLICY "Members can manage budget line items" ON public.budget_line_items
  FOR ALL USING (
    version_id IN (
      SELECT bv.id FROM public.budget_versions bv
      JOIN public.organization_members om ON bv.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
    )
  );
-- Change orders: Via project's org
DROP POLICY IF EXISTS "Members can view change orders" ON public.budget_change_orders;
CREATE POLICY "Members can view change orders" ON public.budget_change_orders
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage change orders" ON public.budget_change_orders;
CREATE POLICY "Members can manage change orders" ON public.budget_change_orders
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
    )
  );
-- Commitments: Via project's org
DROP POLICY IF EXISTS "Members can view commitments" ON public.budget_commitments;
CREATE POLICY "Members can view commitments" ON public.budget_commitments
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage commitments" ON public.budget_commitments;
CREATE POLICY "Members can manage commitments" ON public.budget_commitments
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
    )
  );
-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE TRIGGER update_budget_versions_updated_at
  BEFORE UPDATE ON public.budget_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_change_orders_updated_at
  BEFORE UPDATE ON public.budget_change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_commitments_updated_at
  BEFORE UPDATE ON public.budget_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to recalculate line item totals from children
CREATE OR REPLACE FUNCTION recalculate_budget_line_item(p_line_item_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_children BOOLEAN;
BEGIN
  -- Check if this item has children
  SELECT EXISTS(SELECT 1 FROM public.budget_line_items WHERE parent_id = p_line_item_id) INTO v_has_children;
  
  IF v_has_children THEN
    -- Sum up children values
    UPDATE public.budget_line_items li
    SET
      original_budget = COALESCE((SELECT SUM(original_budget) FROM public.budget_line_items WHERE parent_id = li.id), 0),
      revised_budget = COALESCE((SELECT SUM(revised_budget) FROM public.budget_line_items WHERE parent_id = li.id), 0),
      committed = COALESCE((SELECT SUM(committed) FROM public.budget_line_items WHERE parent_id = li.id), 0),
      actual = COALESCE((SELECT SUM(actual) FROM public.budget_line_items WHERE parent_id = li.id), 0),
      projected_final = COALESCE((SELECT SUM(projected_final) FROM public.budget_line_items WHERE parent_id = li.id), 0)
    WHERE id = p_line_item_id;
  END IF;
  
  -- Calculate variance
  UPDATE public.budget_line_items
  SET variance = projected_final - revised_budget
  WHERE id = p_line_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to recalculate version totals
CREATE OR REPLACE FUNCTION recalculate_budget_version_totals(p_version_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.budget_versions
  SET
    total_original_budget = COALESCE((
      SELECT SUM(original_budget) FROM public.budget_line_items 
      WHERE version_id = p_version_id AND parent_id IS NULL
    ), 0),
    total_revised_budget = COALESCE((
      SELECT SUM(revised_budget) FROM public.budget_line_items 
      WHERE version_id = p_version_id AND parent_id IS NULL
    ), 0),
    total_committed = COALESCE((
      SELECT SUM(committed) FROM public.budget_line_items 
      WHERE version_id = p_version_id AND parent_id IS NULL
    ), 0),
    total_actual = COALESCE((
      SELECT SUM(actual) FROM public.budget_line_items 
      WHERE version_id = p_version_id AND parent_id IS NULL
    ), 0),
    updated_at = NOW()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to apply a change order to a line item
CREATE OR REPLACE FUNCTION apply_change_order(p_change_order_id UUID, p_approved_by UUID)
RETURNS VOID AS $$
DECLARE
  v_co RECORD;
BEGIN
  -- Get change order details
  SELECT * INTO v_co FROM public.budget_change_orders WHERE id = p_change_order_id;
  
  IF v_co.status != 'pending' THEN
    RAISE EXCEPTION 'Change order is not pending';
  END IF;
  
  -- Update the line item's revised budget
  IF v_co.line_item_id IS NOT NULL THEN
    UPDATE public.budget_line_items
    SET 
      revised_budget = revised_budget + v_co.amount,
      projected_final = projected_final + v_co.amount
    WHERE id = v_co.line_item_id;
  END IF;
  
  -- Mark change order as approved
  UPDATE public.budget_change_orders
  SET 
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW()
  WHERE id = p_change_order_id;
  
  -- Recalculate version totals
  IF v_co.version_id IS NOT NULL THEN
    PERFORM recalculate_budget_version_totals(v_co.version_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION recalculate_budget_line_item TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_budget_version_totals TO authenticated;
GRANT EXECUTE ON FUNCTION apply_change_order TO authenticated;
-- =====================================================
-- DONE! Budget management tables are ready.
-- =====================================================;
