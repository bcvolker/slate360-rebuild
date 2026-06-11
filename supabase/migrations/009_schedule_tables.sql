-- =====================================================
-- SCHEDULE MANAGEMENT TABLES
-- Gantt-compatible schedule with versioning, baselines, and milestones
-- Run after main schema.sql
-- =====================================================

-- =====================================================
-- 1. SCHEDULE VERSIONS TABLE
-- Tracks different schedule versions (baselines, revisions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Version info
  name TEXT NOT NULL DEFAULT 'Original Schedule',
  description TEXT,
  version_number INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT false, -- Only one active version per project
  is_baseline BOOLEAN DEFAULT false, -- Is this a baseline version?
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'locked', 'archived'
  
  -- Schedule summary (denormalized for performance)
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  milestones_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. SCHEDULE TASKS TABLE
-- Individual tasks in the schedule
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID REFERENCES public.schedule_versions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Task hierarchy
  parent_id UUID REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  wbs_code TEXT, -- e.g., "1", "1.1", "1.1.1"
  
  -- Task info
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task', -- 'task', 'milestone', 'summary', 'phase'
  
  -- Dates - Current schedule
  start_date DATE,
  end_date DATE,
  duration_days INTEGER, -- Working days
  
  -- Dates - Baseline (for comparison)
  baseline_start DATE,
  baseline_end DATE,
  baseline_duration INTEGER,
  
  -- Progress
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  actual_start DATE,
  actual_end DATE,
  
  -- Dependencies (stored as JSON array of task IDs)
  predecessors JSONB DEFAULT '[]'::jsonb, -- [{id: "uuid", type: "FS", lag: 0}]
  successors JSONB DEFAULT '[]'::jsonb,
  
  -- Resources (stored as JSON array)
  assigned_resources JSONB DEFAULT '[]'::jsonb, -- [{id: "uuid", name: "John", allocation: 100}]
  
  -- Constraints
  constraint_type TEXT, -- 'ASAP', 'ALAP', 'MSO', 'MFO', 'SNET', 'SNLT', 'FNET', 'FNLT'
  constraint_date DATE,
  
  -- Status
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'complete', 'on_hold', 'delayed'
  is_critical BOOLEAN DEFAULT false, -- On critical path
  is_milestone BOOLEAN DEFAULT false,
  
  -- Display
  color TEXT,
  is_expanded BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. SCHEDULE MILESTONES TABLE
-- Key project milestones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedule_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.schedule_tasks(id) ON DELETE SET NULL,
  
  -- Milestone info
  name TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT DEFAULT 'standard', -- 'standard', 'contract', 'owner', 'regulatory'
  
  -- Dates
  target_date DATE NOT NULL,
  baseline_date DATE,
  actual_date DATE,
  
  -- Status
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'at_risk', 'complete', 'missed'
  
  -- Importance
  is_critical BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_schedule_versions_project ON public.schedule_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_active ON public.schedule_versions(project_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_versions_baseline ON public.schedule_versions(project_id, is_baseline) WHERE is_baseline = true;
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_version ON public.schedule_tasks(version_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_parent ON public.schedule_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_dates ON public.schedule_tasks(version_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_status ON public.schedule_tasks(version_id, status);
CREATE INDEX IF NOT EXISTS idx_schedule_milestones_project ON public.schedule_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_milestones_date ON public.schedule_milestones(target_date);
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_milestones ENABLE ROW LEVEL SECURITY;
-- Schedule versions: Members can view their org's schedules
DROP POLICY IF EXISTS "Members can view org schedule versions" ON public.schedule_versions;
CREATE POLICY "Members can view org schedule versions" ON public.schedule_versions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage org schedule versions" ON public.schedule_versions;
CREATE POLICY "Members can manage org schedule versions" ON public.schedule_versions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );
-- Schedule tasks: Via version's org
DROP POLICY IF EXISTS "Members can view schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Members can view schedule tasks" ON public.schedule_tasks
  FOR SELECT USING (
    version_id IN (
      SELECT sv.id FROM public.schedule_versions sv
      JOIN public.organization_members om ON sv.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage schedule tasks" ON public.schedule_tasks;
CREATE POLICY "Members can manage schedule tasks" ON public.schedule_tasks
  FOR ALL USING (
    version_id IN (
      SELECT sv.id FROM public.schedule_versions sv
      JOIN public.organization_members om ON sv.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
    )
  );
-- Milestones: Via project's org
DROP POLICY IF EXISTS "Members can view milestones" ON public.schedule_milestones;
CREATE POLICY "Members can view milestones" ON public.schedule_milestones
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage milestones" ON public.schedule_milestones;
CREATE POLICY "Members can manage milestones" ON public.schedule_milestones
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

CREATE TRIGGER update_schedule_versions_updated_at
  BEFORE UPDATE ON public.schedule_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_tasks_updated_at
  BEFORE UPDATE ON public.schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_milestones_updated_at
  BEFORE UPDATE ON public.schedule_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to recalculate version summary
CREATE OR REPLACE FUNCTION recalculate_schedule_version_summary(p_version_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.schedule_versions
  SET
    total_tasks = COALESCE((
      SELECT COUNT(*) FROM public.schedule_tasks WHERE version_id = p_version_id
    ), 0),
    completed_tasks = COALESCE((
      SELECT COUNT(*) FROM public.schedule_tasks 
      WHERE version_id = p_version_id AND status = 'complete'
    ), 0),
    milestones_count = COALESCE((
      SELECT COUNT(*) FROM public.schedule_tasks 
      WHERE version_id = p_version_id AND is_milestone = true
    ), 0),
    start_date = (
      SELECT MIN(start_date) FROM public.schedule_tasks 
      WHERE version_id = p_version_id AND start_date IS NOT NULL
    ),
    end_date = (
      SELECT MAX(end_date) FROM public.schedule_tasks 
      WHERE version_id = p_version_id AND end_date IS NOT NULL
    ),
    updated_at = NOW()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to update task status based on dates and progress
CREATE OR REPLACE FUNCTION update_task_status(p_task_id UUID)
RETURNS VOID AS $$
DECLARE
  v_task RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_task FROM public.schedule_tasks WHERE id = p_task_id;
  
  IF v_task.percent_complete = 100 THEN
    v_new_status := 'complete';
  ELSIF v_task.percent_complete > 0 THEN
    v_new_status := 'in_progress';
  ELSIF v_task.start_date <= CURRENT_DATE AND v_task.percent_complete = 0 THEN
    v_new_status := 'delayed';
  ELSE
    v_new_status := 'not_started';
  END IF;
  
  UPDATE public.schedule_tasks SET status = v_new_status WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION recalculate_schedule_version_summary TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status TO authenticated;
-- =====================================================
-- DONE! Schedule management tables are ready.
-- =====================================================;
