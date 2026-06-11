-- =====================================================
-- SLATE360 MISSING TABLES MIGRATION
-- Adds all tables used by the application but missing from schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- 1. SHARED LINKS TABLE (for project sharing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Link details
  token TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  link_type TEXT DEFAULT 'view' CHECK (link_type IN ('view', 'edit', 'admin')),
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,

  -- Access control
  password_hash TEXT,
  allowed_emails TEXT[], -- Email domains or specific emails
  require_auth BOOLEAN DEFAULT false,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. PROJECT ACTIVITY TABLE (for activity feeds)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),

  -- Activity details
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'commented', etc.
  resource_type TEXT NOT NULL, -- 'project', 'task', 'document', etc.
  resource_id UUID,
  description TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  old_values JSONB,
  new_values JSONB,

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  team_only BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. INTEGRATION TABLES
-- =====================================================

-- Integration OAuth States (for OAuth flows)
CREATE TABLE IF NOT EXISTS public.integration_oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),

  -- OAuth details
  provider TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT,
  redirect_uri TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- User Integrations (connected accounts)
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),

  -- Integration details
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, provider, provider_user_id)
);
-- Integration Activity Log
CREATE TABLE IF NOT EXISTS public.integration_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  integration_id UUID REFERENCES public.user_integrations(id) ON DELETE CASCADE,

  -- Activity details
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Integration Webhooks
CREATE TABLE IF NOT EXISTS public.integration_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.user_integrations(id) ON DELETE CASCADE,

  -- Webhook details
  provider TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT, -- Encrypted

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, webhook_id)
);
-- =====================================================
-- 4. DOCUMENT MANAGEMENT TABLES
-- =====================================================

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Document details
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  mime_type TEXT,

  -- Document type and status
  document_type TEXT, -- 'contract', 'drawing', 'spec', 'permit', etc.
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',

  -- Permissions
  is_public BOOLEAN DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Document Signatures
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  signed_by UUID REFERENCES public.profiles(id),

  -- Signature details
  signature_type TEXT DEFAULT 'electronic', -- 'electronic', 'wet_ink', 'digital'
  signature_data TEXT, -- Base64 encoded signature image/data
  ip_address TEXT,
  user_agent TEXT,

  -- Legal
  legal_name TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  is_valid BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- File Versions (for document versioning)
CREATE TABLE IF NOT EXISTS public.file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),

  -- Version details
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Change tracking
  change_description TEXT,
  is_current BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Document Workflows
CREATE TABLE IF NOT EXISTS public.document_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Workflow details
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT, -- 'approval', 'review', 'signature'
  status TEXT DEFAULT 'active',

  -- Steps configuration
  steps JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Workflow Executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.document_workflows(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.profiles(id),

  -- Execution details
  status TEXT DEFAULT 'in_progress',
  current_step INTEGER DEFAULT 1,
  step_data JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 5. CONSTRUCTION MANAGEMENT TABLES
-- =====================================================

-- Pay Applications
CREATE TABLE IF NOT EXISTS public.pay_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Application details
  application_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'draft',

  -- Financials
  contract_amount DECIMAL(15,2),
  previous_certified DECIMAL(15,2) DEFAULT 0,
  this_period DECIMAL(15,2) DEFAULT 0,
  total_certified DECIMAL(15,2) DEFAULT 0,
  retainage DECIMAL(15,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, application_number)
);
-- Schedule of Values
CREATE TABLE IF NOT EXISTS public.schedule_of_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- SOV details
  item_number TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,2),
  unit TEXT,
  unit_price DECIMAL(15,2),
  total_amount DECIMAL(15,2),

  -- Categorization
  category TEXT,
  subcategory TEXT,
  cost_code TEXT,

  -- Status
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Change Orders
CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- CO details
  change_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,

  -- Financial impact
  estimated_cost DECIMAL(15,2),
  approved_cost DECIMAL(15,2),
  schedule_impact_days INTEGER,

  -- Status and approval
  status TEXT DEFAULT 'draft',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, change_order_number)
);
-- Completion Certificates
CREATE TABLE IF NOT EXISTS public.completion_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Certificate details
  certificate_number TEXT NOT NULL,
  certificate_type TEXT, -- 'substantial', 'final', 'punch_list'
  title TEXT NOT NULL,
  description TEXT,

  -- Dates
  issued_date DATE,
  effective_date DATE,

  -- Status
  status TEXT DEFAULT 'draft',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, certificate_number)
);
-- =====================================================
-- 6. ADDITIONAL PROJECT TABLES
-- =====================================================

-- Schedule Tasks (for project scheduling)
CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Task details
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task',

  -- Scheduling
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  progress_percentage INTEGER DEFAULT 0,

  -- Dependencies
  predecessor_ids UUID[],
  successor_ids UUID[],

  -- Resources
  assigned_to UUID[] DEFAULT '{}',
  resources JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT DEFAULT 'not_started',

  -- Hierarchy
  parent_id UUID REFERENCES public.schedule_tasks(id),
  level INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Budget Line Items
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),

  -- Budget details
  item_number TEXT,
  description TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,

  -- Financials
  budgeted_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2) DEFAULT 0,
  committed_amount DECIMAL(15,2) DEFAULT 0,

  -- Cost codes
  cost_code TEXT,
  csi_code TEXT,

  -- Status
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 7. AUTODESK SYNC QUEUE (for BIM 360 integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.autodesk_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.user_integrations(id),

  -- Sync details
  sync_type TEXT NOT NULL, -- 'upload', 'download', 'sync'
  resource_type TEXT NOT NULL, -- 'document', 'model', 'sheet'
  resource_id TEXT NOT NULL,
  autodesk_project_id TEXT,
  autodesk_resource_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Data
  sync_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  UNIQUE(project_id, resource_type, resource_id, sync_type)
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_project_id ON public.shared_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON public.project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON public.project_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_state ON public.integration_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_user_integrations_org_provider ON public.user_integrations(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_activity_log_integration_id ON public.integration_activity_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_document_id ON public.file_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pay_applications_project_id ON public.pay_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_project_id ON public.schedule_of_values(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_completion_certificates_project_id ON public.completion_certificates(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project_id ON public.schedule_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_project_id ON public.budget_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_autodesk_sync_queue_status ON public.autodesk_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_autodesk_sync_queue_project_id ON public.autodesk_sync_queue(project_id);
-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_of_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autodesk_sync_queue ENABLE ROW LEVEL SECURITY;
-- Shared Links: Project members can view, creators can manage
DROP POLICY IF EXISTS "Project members can view shared links" ON public.shared_links;
CREATE POLICY "Project members can view shared links" ON public.shared_links
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "Link creators can manage shared links" ON public.shared_links;
CREATE POLICY "Link creators can manage shared links" ON public.shared_links
  FOR ALL USING (created_by = auth.uid());
-- Project Activity: Project members can view
DROP POLICY IF EXISTS "Project members can view activity" ON public.project_activity;
CREATE POLICY "Project members can view activity" ON public.project_activity
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
-- Integration tables: Organization members can manage
DROP POLICY IF EXISTS "Org members can manage integrations" ON public.user_integrations;
CREATE POLICY "Org members can manage integrations" ON public.user_integrations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Org members can view integration activity" ON public.integration_activity_log;
CREATE POLICY "Org members can view integration activity" ON public.integration_activity_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Documents: Project members can access
DROP POLICY IF EXISTS "Project members can view documents" ON public.documents;
CREATE POLICY "Project members can view documents" ON public.documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "Project members can manage documents" ON public.documents;
CREATE POLICY "Project members can manage documents" ON public.documents
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
-- Construction management tables: Project members can access
DROP POLICY IF EXISTS "Project members can view pay applications" ON public.pay_applications;
CREATE POLICY "Project members can view pay applications" ON public.pay_applications
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "Project members can manage pay applications" ON public.pay_applications;
CREATE POLICY "Project members can manage pay applications" ON public.pay_applications
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
-- Apply similar policies to other construction tables
DROP POLICY IF EXISTS "Project members can view SOV" ON public.schedule_of_values;
CREATE POLICY "Project members can view SOV" ON public.schedule_of_values FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can manage SOV" ON public.schedule_of_values;
CREATE POLICY "Project members can manage SOV" ON public.schedule_of_values FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can view change orders" ON public.change_orders;
CREATE POLICY "Project members can view change orders" ON public.change_orders FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can manage change orders" ON public.change_orders;
CREATE POLICY "Project members can manage change orders" ON public.change_orders FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
-- Similar policies for other tables...
DROP POLICY IF EXISTS "Project members can view certificates" ON public.completion_certificates;
CREATE POLICY "Project members can view certificates" ON public.completion_certificates FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can manage certificates" ON public.completion_certificates;
CREATE POLICY "Project members can manage certificates" ON public.completion_certificates FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can view schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Project members can view schedule tasks" ON public.schedule_tasks FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can manage schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Project members can manage schedule tasks" ON public.schedule_tasks FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can view budget items" ON public.budget_line_items;
CREATE POLICY "Project members can view budget items" ON public.budget_line_items FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Project members can manage budget items" ON public.budget_line_items;
CREATE POLICY "Project members can manage budget items" ON public.budget_line_items FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);
-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Grant permissions on new tables
GRANT ALL ON public.shared_links TO authenticated;
GRANT ALL ON public.project_activity TO authenticated;
GRANT ALL ON public.integration_oauth_states TO authenticated;
GRANT ALL ON public.user_integrations TO authenticated;
GRANT ALL ON public.integration_activity_log TO authenticated;
GRANT ALL ON public.integration_webhooks TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.document_signatures TO authenticated;
GRANT ALL ON public.file_versions TO authenticated;
GRANT ALL ON public.document_workflows TO authenticated;
GRANT ALL ON public.workflow_executions TO authenticated;
GRANT ALL ON public.pay_applications TO authenticated;
GRANT ALL ON public.schedule_of_values TO authenticated;
GRANT ALL ON public.change_orders TO authenticated;
GRANT ALL ON public.completion_certificates TO authenticated;
GRANT ALL ON public.schedule_tasks TO authenticated;
GRANT ALL ON public.budget_line_items TO authenticated;
GRANT ALL ON public.autodesk_sync_queue TO authenticated;
-- =====================================================
-- UPDATE TRIGGERS FOR NEW TABLES
-- =====================================================

-- Function to update updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to new tables
DROP TRIGGER IF EXISTS update_shared_links_updated_at ON public.shared_links;
CREATE TRIGGER update_shared_links_updated_at BEFORE UPDATE ON shared_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_integrations_updated_at ON public.user_integrations;
CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_webhooks_updated_at ON public.integration_webhooks;
CREATE TRIGGER update_integration_webhooks_updated_at BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_document_workflows_updated_at ON public.document_workflows;
CREATE TRIGGER update_document_workflows_updated_at BEFORE UPDATE ON document_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON public.workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_pay_applications_updated_at ON public.pay_applications;
CREATE TRIGGER update_pay_applications_updated_at BEFORE UPDATE ON pay_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_schedule_of_values_updated_at ON public.schedule_of_values;
CREATE TRIGGER update_schedule_of_values_updated_at BEFORE UPDATE ON schedule_of_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_change_orders_updated_at ON public.change_orders;
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_completion_certificates_updated_at ON public.completion_certificates;
CREATE TRIGGER update_completion_certificates_updated_at BEFORE UPDATE ON completion_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_schedule_tasks_updated_at ON public.schedule_tasks;
CREATE TRIGGER update_schedule_tasks_updated_at BEFORE UPDATE ON schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_budget_line_items_updated_at ON public.budget_line_items;
CREATE TRIGGER update_budget_line_items_updated_at BEFORE UPDATE ON budget_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- SUCCESS! All missing tables have been created.
-- =====================================================;
