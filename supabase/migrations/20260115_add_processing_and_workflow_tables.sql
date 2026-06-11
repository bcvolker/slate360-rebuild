-- Migration: Add processing jobs table and related functions
-- Run with: psql -h your-db-host -U postgres -d postgres -f this-file.sql

-- ============================================================================
-- MODEL PROCESSING JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_processing_jobs (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL CHECK (job_type IN (
    'photogrammetry',
    'point_cloud_tiling',
    'gaussian_splatting',
    'model_optimization',
    'video_processing',
    'digital_twin_build',
    'mesh_reconstruction',
    'texture_mapping'
  )),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'preprocessing',
    'processing',
    'postprocessing',
    'completed',
    'failed',
    'cancelled'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Files
  input_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_files JSONB,
  output_path TEXT,
  
  -- Progress
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_stage TEXT NOT NULL DEFAULT 'Queued',
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Credits
  credits_estimated INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  gpu_minutes DECIMAL(10, 2),
  
  -- Settings
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Notifications
  notify_on_complete BOOLEAN DEFAULT TRUE,
  notify_emails TEXT[],
  webhook_url TEXT,
  
  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project ON public.model_processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user ON public.model_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.model_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created ON public.model_processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_queued ON public.model_processing_jobs(status, priority, created_at) 
  WHERE status = 'queued';
-- ============================================================================
-- DOCUMENT WORKFLOWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.unified_files(id) ON DELETE SET NULL,
  
  -- Workflow details
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sent',
    'pending_signature',
    'pending_review',
    'approved',
    'denied',
    'on_hold',
    'revision_requested',
    'received',
    'completed'
  )),
  
  -- Participants
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Options
  require_signature BOOLEAN DEFAULT FALSE,
  require_email BOOLEAN DEFAULT TRUE,
  due_date TIMESTAMPTZ,
  reminder_days INTEGER,
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  revision_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_workflows_project ON public.document_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_workflows_status ON public.document_workflows(status);
CREATE INDEX IF NOT EXISTS idx_doc_workflows_sender ON public.document_workflows(sender_id);
-- ============================================================================
-- DOCUMENT WORKFLOW HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.document_workflows(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_name TEXT,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow ON public.document_workflow_history(workflow_id);
-- ============================================================================
-- SCHEDULE VERSIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_baseline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_project ON public.schedule_versions(project_id);
-- ============================================================================
-- SCHEDULE TASKS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id TEXT PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.schedule_versions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  parent_id TEXT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  
  is_milestone BOOLEAN DEFAULT FALSE,
  is_summary BOOLEAN DEFAULT FALSE,
  level INTEGER DEFAULT 0,
  wbs_code TEXT,
  
  phase TEXT,
  assignee TEXT,
  color TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  is_expanded BOOLEAN DEFAULT TRUE,
  
  depends_on_ids TEXT[],
  baseline_start DATE,
  baseline_end DATE,
  
  external_id TEXT,
  external_source TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_version ON public.schedule_tasks(version_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project ON public.schedule_tasks(project_id);
-- ============================================================================
-- CREDIT FUNCTIONS
-- ============================================================================

-- Function to add credits to a user
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits_balance = COALESCE(credits_balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_balance INTO v_new_balance;
  
  RETURN COALESCE(v_new_balance, 0);
END;
$$;
-- Function to deduct credits from a user
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;
-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.model_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
-- Processing jobs policies
DROP POLICY IF EXISTS "Users can view their own processing jobs" ON public.model_processing_jobs;
CREATE POLICY "Users can view their own processing jobs" ON public.model_processing_jobs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can insert processing jobs" ON public.model_processing_jobs;
CREATE POLICY "Users can insert processing jobs" ON public.model_processing_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own processing jobs" ON public.model_processing_jobs;
CREATE POLICY "Users can update their own processing jobs" ON public.model_processing_jobs
  FOR UPDATE
  USING (user_id = auth.uid());
-- Document workflows policies
DROP POLICY IF EXISTS "Users can view document workflows in their orgs" ON public.document_workflows;
CREATE POLICY "Users can view document workflows in their orgs" ON public.document_workflows
  FOR SELECT
  USING (
    sender_id = auth.uid() OR
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can create document workflows" ON public.document_workflows;
CREATE POLICY "Users can create document workflows" ON public.document_workflows
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "Users can update document workflows" ON public.document_workflows;
CREATE POLICY "Users can update document workflows" ON public.document_workflows
  FOR UPDATE
  USING (sender_id = auth.uid());
-- Schedule versions policies
DROP POLICY IF EXISTS "Users can view schedule versions in their projects" ON public.schedule_versions;
CREATE POLICY "Users can view schedule versions in their projects" ON public.schedule_versions
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can manage schedule versions" ON public.schedule_versions;
CREATE POLICY "Users can manage schedule versions" ON public.schedule_versions
  FOR ALL
  USING (created_by = auth.uid());
-- Schedule tasks policies
DROP POLICY IF EXISTS "Users can view schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Users can view schedule tasks" ON public.schedule_tasks
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can manage schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Users can manage schedule tasks" ON public.schedule_tasks
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON public.model_processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON public.model_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_document_workflows_updated_at ON public.document_workflows;
CREATE TRIGGER update_document_workflows_updated_at
  BEFORE UPDATE ON public.document_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_schedule_versions_updated_at ON public.schedule_versions;
CREATE TRIGGER update_schedule_versions_updated_at
  BEFORE UPDATE ON public.schedule_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_schedule_tasks_updated_at ON public.schedule_tasks;
CREATE TRIGGER update_schedule_tasks_updated_at
  BEFORE UPDATE ON public.schedule_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_workflows TO authenticated;
GRANT SELECT, INSERT ON public.document_workflow_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
