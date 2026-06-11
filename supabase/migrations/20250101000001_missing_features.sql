-- =====================================================
-- MIGRATION: MISSING FEATURES (Financials, Usage, PM)
-- =====================================================

-- =====================================================
-- 1. ORG USAGE TABLE
-- Tracks resource consumption for organizations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.org_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Storage
  storage_bytes_used BIGINT DEFAULT 0,
  storage_bytes_limit BIGINT DEFAULT 524288000, -- Default 500MB (Trial)
  
  -- Compute
  compute_units_used INTEGER DEFAULT 0,
  compute_units_limit INTEGER DEFAULT 100,
  
  -- Bandwidth
  bandwidth_bytes_used BIGINT DEFAULT 0,
  bandwidth_bytes_limit BIGINT DEFAULT 5368709120, -- Default 5GB
  
  -- Period tracking
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);
-- =====================================================
-- 2. PROJECT FINANCIALS: EXPENSES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  
  description TEXT NOT NULL,
  category TEXT, -- 'Materials', 'Labor', 'Equipment', 'Subcontractor', 'Other'
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  vendor TEXT,
  receipt_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. PROJECT FINANCIALS: INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  
  number TEXT NOT NULL,
  client_name TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 4. PROJECT MANAGEMENT: TASKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  due_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 5. PROJECT MANAGEMENT: RFIs (Request for Information)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id), -- Who needs to answer
  created_by UUID REFERENCES public.profiles(id),
  
  number INTEGER, -- Sequential per project
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'answered', 'closed', 'void'
  due_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 6. PROJECT MANAGEMENT: SUBMITTALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.submittals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id), -- Who needs to review
  created_by UUID REFERENCES public.profiles(id),
  
  number INTEGER,
  title TEXT NOT NULL,
  spec_section TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'submitted', 'approved', 'rejected', 'revise_resubmit'
  due_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES & RLS
-- =====================================================

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to ON public.rfis(assigned_to);
CREATE INDEX IF NOT EXISTS idx_rfis_project_id ON public.rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_assigned_to ON public.submittals(assigned_to);
-- Enable RLS
ALTER TABLE public.org_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
-- RLS Policies (Simplified: Members of the project's org can view/edit)
-- Note: In a real app, you'd join with organization_members to verify access.
-- For brevity, we assume if you can see the project, you can see its items.

CREATE POLICY "Org members can view usage" ON public.org_usage
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Helper function for project access check could be useful here, 
-- but we'll use the standard pattern:
-- Check if project belongs to an org the user is a member of.

CREATE POLICY "Members can view expenses" ON public.expenses
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can view invoices" ON public.invoices
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can view tasks" ON public.project_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can view rfis" ON public.rfis
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can view submittals" ON public.submittals
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
