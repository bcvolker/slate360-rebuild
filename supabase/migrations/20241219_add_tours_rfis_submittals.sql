-- =====================================================
-- SLATE360 DATABASE MIGRATION
-- Add Tours, RFIs, Submittals, Tasks, Daily Reports
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TOURS TABLE (360 Tour Builder)
-- Stores 360 tour configurations and scenes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Tour metadata
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  
  -- Scene configuration (Pannellum format)
  scenes JSONB DEFAULT '[]'::jsonb,
  -- Example: [{ "id": "scene1", "imageUrl": "...", "pitch": 0, "yaw": 0, "hotspots": [...] }]
  
  -- Hotspots configuration
  hotspots JSONB DEFAULT '[]'::jsonb,
  -- Example: [{ "id": "hs1", "sceneId": "scene1", "pitch": 10, "yaw": 45, "type": "info", "content": {...} }]
  
  -- Branding/styling
  branding JSONB DEFAULT '{}'::jsonb,
  -- Example: { "logoUrl": "...", "primaryColor": "#000", "companyName": "...", "customDomain": "..." }
  
  -- Sharing
  published_url TEXT,
  embed_code TEXT,
  password_hash TEXT, -- Optional password protection
  expires_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  
  -- VR settings
  vr_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. TOUR ANALYTICS TABLE
-- Tracks views and interactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tour_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  
  -- Viewer info
  viewer_ip INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Session data
  session_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Interaction data
  scenes_viewed JSONB DEFAULT '[]'::jsonb, -- ["scene1", "scene2", ...]
  hotspots_clicked JSONB DEFAULT '[]'::jsonb, -- ["hs1", "hs3", ...]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. RFIs TABLE (Request for Information)
-- Construction RFI tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- RFI identification
  rfi_number TEXT NOT NULL, -- Auto-generated like "RFI-001"
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Status workflow
  status TEXT DEFAULT 'draft', 
  -- 'draft', 'open', 'pending_review', 'answered', 'closed', 'void'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  
  -- Assignment
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  
  -- Ball-in-court tracking
  ball_in_court TEXT, -- 'architect', 'contractor', 'owner', 'engineer', etc.
  
  -- Dates
  date_required TIMESTAMPTZ,
  date_answered TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  
  -- Cost/schedule impact
  cost_impact DECIMAL(15, 2),
  schedule_impact_days INTEGER,
  
  -- Attachments and references
  attachments JSONB DEFAULT '[]'::jsonb,
  -- [{ "id": "...", "name": "drawing.pdf", "url": "...", "type": "application/pdf" }]
  
  -- Location reference (can link to tour scene or map pin)
  location JSONB,
  -- { "type": "map", "lat": 0, "lng": 0 } or { "type": "tour", "tourId": "...", "sceneId": "..." }
  
  -- Response
  response TEXT,
  response_by UUID REFERENCES public.profiles(id),
  response_at TIMESTAMPTZ,
  
  -- Spec section reference
  spec_section TEXT,
  drawing_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 4. SUBMITTALS TABLE
-- Construction submittal tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.submittals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Submittal identification
  submittal_number TEXT NOT NULL, -- Auto-generated like "SUB-001"
  revision TEXT DEFAULT 'A', -- A, B, C, etc.
  title TEXT NOT NULL,
  description TEXT,
  
  -- CSI spec section
  spec_section TEXT, -- e.g., "03 30 00" for Concrete
  spec_section_name TEXT,
  
  -- Status workflow
  status TEXT DEFAULT 'draft',
  -- 'draft', 'pending_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'for_record'
  
  -- Assignment
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  submitted_by TEXT, -- Company/vendor name
  
  -- Review workflow
  reviewer UUID REFERENCES public.profiles(id),
  review_status TEXT,
  review_comments TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Dates
  date_required TIMESTAMPTZ,
  date_submitted TIMESTAMPTZ,
  date_returned TIMESTAMPTZ,
  lead_time_days INTEGER,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Related items
  related_rfis JSONB DEFAULT '[]'::jsonb, -- [{ "id": "...", "number": "RFI-001" }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 5. TASKS TABLE (Project Hub Tasks)
-- General task management
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE, -- For subtasks
  
  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  task_number TEXT, -- Auto-generated
  
  -- Status
  status TEXT DEFAULT 'not_started',
  -- 'not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  
  -- Assignment
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  
  -- Dates (for Gantt chart)
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  duration_days INTEGER,
  
  -- Progress
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  
  -- Dependencies (for Gantt)
  predecessors JSONB DEFAULT '[]'::jsonb, -- [{ "taskId": "...", "type": "FS" }]
  
  -- Attachments and checklist
  attachments JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  -- [{ "id": "...", "text": "Review drawings", "completed": false }]
  
  -- Location reference
  location JSONB,
  
  -- Tags/labels
  tags JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 6. PUNCH LISTS TABLE
-- Construction punch list items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.punch_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Punch item info
  item_number TEXT NOT NULL, -- Auto-generated like "P-001"
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'open',
  -- 'open', 'in_progress', 'ready_for_inspection', 'completed', 'rejected'
  priority TEXT DEFAULT 'normal',
  
  -- Assignment
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  responsible_party TEXT, -- Company name
  
  -- Trade/category
  trade TEXT, -- 'Electrical', 'Plumbing', 'HVAC', etc.
  area TEXT, -- 'Level 1', 'Room 101', etc.
  
  -- Dates
  due_date DATE,
  completed_date DATE,
  
  -- Location (map pin or tour hotspot)
  location JSONB,
  
  -- Photos (before/after)
  photos JSONB DEFAULT '[]'::jsonb,
  -- [{ "id": "...", "url": "...", "type": "before" | "after", "caption": "..." }]
  
  -- Verification
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 7. DAILY REPORTS TABLE
-- Daily field reports / daily logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Report info
  report_number TEXT NOT NULL, -- Auto-generated like "DR-2024-001"
  report_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'approved'
  
  -- Created by
  created_by UUID REFERENCES public.profiles(id),
  superintendent TEXT, -- Name of super on site
  
  -- Weather
  weather JSONB DEFAULT '{}'::jsonb,
  -- { "condition": "sunny", "tempHigh": 75, "tempLow": 55, "precipitation": false, "windSpeed": 10 }
  
  -- Workforce
  workforce JSONB DEFAULT '[]'::jsonb,
  -- [{ "trade": "Concrete", "company": "ABC Concrete", "workers": 5, "hours": 8 }]
  
  -- Equipment on site
  equipment JSONB DEFAULT '[]'::jsonb,
  -- [{ "type": "Excavator", "quantity": 2, "hours": 6, "idle": false }]
  
  -- Work performed
  work_performed TEXT,
  work_activities JSONB DEFAULT '[]'::jsonb,
  -- [{ "description": "Poured footings", "location": "Grid A-B", "percentComplete": 50 }]
  
  -- Visitors
  visitors JSONB DEFAULT '[]'::jsonb,
  -- [{ "name": "John Smith", "company": "City Inspector", "time": "10:00 AM", "purpose": "Inspection" }]
  
  -- Delays/issues
  delays JSONB DEFAULT '[]'::jsonb,
  -- [{ "type": "weather", "description": "Rain delay", "hours": 2, "impactedTrades": ["Concrete"] }]
  
  -- Safety observations
  safety_observations TEXT,
  incidents JSONB DEFAULT '[]'::jsonb,
  
  -- Photos
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Deliveries
  deliveries JSONB DEFAULT '[]'::jsonb,
  -- [{ "material": "Rebar", "vendor": "ABC Steel", "quantity": "5 tons", "poNumber": "PO-123" }]
  
  -- Notes
  notes TEXT,
  
  -- Approval
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 8. MODEL PROCESSING JOBS TABLE
-- Tracks 3D model processing queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.model_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  
  -- Source file info
  source_url TEXT NOT NULL,
  source_format TEXT NOT NULL, -- 'obj', 'fbx', 'las', 'photos', etc.
  source_size BIGINT, -- bytes
  source_file_count INTEGER DEFAULT 1, -- For photo sets
  
  -- Job status
  status TEXT DEFAULT 'queued',
  -- 'queued', 'analyzing', 'processing', 'optimizing', 'generating_tiles', 'uploading', 'completed', 'failed'
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  
  -- Processing options
  options JSONB DEFAULT '{}'::jsonb,
  -- { "formats": ["glb_draco", "3dtiles"], "quality": 0.9, "generateLOD": true }
  
  -- Analysis results (populated after analysis step)
  analysis JSONB,
  -- { "vertexCount": 1000000, "faceCount": 500000, "hasTextures": true, "estimatedSize": "large" }
  
  -- Outputs (populated as processing completes)
  outputs JSONB DEFAULT '[]'::jsonb,
  -- [{ "format": "glb_draco", "url": "...", "size": 1234567 }, { "format": "3dtiles", "url": "..." }]
  
  -- Thumbnail
  thumbnail_url TEXT,
  
  -- Error info
  error_message TEXT,
  error_details JSONB,
  
  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Worker info
  worker_id TEXT, -- Which worker processed this job
  
  -- Credits used
  credits_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 9. EMAIL NOTIFICATIONS LOG
-- Track sent notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  
  -- Email details
  to_email TEXT NOT NULL,
  to_name TEXT,
  from_email TEXT,
  from_name TEXT,
  subject TEXT NOT NULL,
  template TEXT, -- 'rfi_assigned', 'submittal_approved', 'upload_complete', etc.
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  
  -- Content
  body_html TEXT,
  body_text TEXT,
  
  -- Provider response
  provider TEXT DEFAULT 'sendgrid',
  provider_message_id TEXT,
  provider_response JSONB,
  
  -- Related entity
  related_type TEXT, -- 'rfi', 'submittal', 'task', 'tour', 'model_job', etc.
  related_id UUID,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tours
CREATE INDEX IF NOT EXISTS idx_tours_project_id ON public.tours(project_id);
CREATE INDEX IF NOT EXISTS idx_tours_org_id ON public.tours(org_id);
CREATE INDEX IF NOT EXISTS idx_tours_status ON public.tours(status);
CREATE INDEX IF NOT EXISTS idx_tour_analytics_tour_id ON public.tour_analytics(tour_id);
-- RFIs
CREATE INDEX IF NOT EXISTS idx_rfis_project_id ON public.rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_org_id ON public.rfis(org_id);
CREATE INDEX IF NOT EXISTS idx_rfis_status ON public.rfis(status);
CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to ON public.rfis(assigned_to);
CREATE INDEX IF NOT EXISTS idx_rfis_created_by ON public.rfis(created_by);
-- Submittals
CREATE INDEX IF NOT EXISTS idx_submittals_project_id ON public.submittals(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_org_id ON public.submittals(org_id);
CREATE INDEX IF NOT EXISTS idx_submittals_status ON public.submittals(status);
CREATE INDEX IF NOT EXISTS idx_submittals_assigned_to ON public.submittals(assigned_to);
-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
-- Punch Lists
CREATE INDEX IF NOT EXISTS idx_punch_lists_project_id ON public.punch_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_lists_status ON public.punch_lists(status);
CREATE INDEX IF NOT EXISTS idx_punch_lists_assigned_to ON public.punch_lists(assigned_to);
-- Daily Reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON public.daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON public.daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(status);
-- Model Processing Jobs
CREATE INDEX IF NOT EXISTS idx_model_jobs_project_id ON public.model_processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_model_jobs_user_id ON public.model_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_model_jobs_status ON public.model_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_model_jobs_queued_at ON public.model_processing_jobs(queued_at);
-- Email Notifications
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON public.email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_related ON public.email_notifications(related_type, related_id);
-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
-- Tours: Org members can view/edit
CREATE POLICY "Members can view org tours" ON public.tours
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create org tours" ON public.tours
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update org tours" ON public.tours
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- RFIs: Org members can CRUD
CREATE POLICY "Members can view org rfis" ON public.rfis
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create org rfis" ON public.rfis
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update org rfis" ON public.rfis
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Submittals: Org members can CRUD
CREATE POLICY "Members can view org submittals" ON public.submittals
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create org submittals" ON public.submittals
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update org submittals" ON public.submittals
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Tasks: Org members can CRUD
CREATE POLICY "Members can view org tasks" ON public.tasks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create org tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update org tasks" ON public.tasks
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Punch Lists: Org members can CRUD
CREATE POLICY "Members can view org punch lists" ON public.punch_lists
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can manage org punch lists" ON public.punch_lists
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Daily Reports: Org members can CRUD
CREATE POLICY "Members can view org daily reports" ON public.daily_reports
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can manage org daily reports" ON public.daily_reports
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Model Processing Jobs: Users can view their own or org's jobs
CREATE POLICY "Users can view own processing jobs" ON public.model_processing_jobs
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create processing jobs" ON public.model_processing_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- Email Notifications: Users can view their own
CREATE POLICY "Users can view own notifications" ON public.email_notifications
  FOR SELECT USING (user_id = auth.uid());
-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submittals_updated_at
  BEFORE UPDATE ON public.submittals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_punch_lists_updated_at
  BEFORE UPDATE ON public.punch_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_jobs_updated_at
  BEFORE UPDATE ON public.model_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate next RFI number for a project
CREATE OR REPLACE FUNCTION get_next_rfi_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(rfi_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.rfis
  WHERE project_id = p_project_id;
  
  RETURN 'RFI-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
-- Function to generate next Submittal number for a project
CREATE OR REPLACE FUNCTION get_next_submittal_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(submittal_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.submittals
  WHERE project_id = p_project_id;
  
  RETURN 'SUB-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
-- Function to generate next Punch item number for a project
CREATE OR REPLACE FUNCTION get_next_punch_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.punch_lists
  WHERE project_id = p_project_id;
  
  RETURN 'P-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
-- Function to generate daily report number
CREATE OR REPLACE FUNCTION get_next_daily_report_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.daily_reports
  WHERE project_id = p_project_id
    AND report_number LIKE 'DR-' || year_str || '-%';
  
  RETURN 'DR-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.tours TO authenticated;
GRANT ALL ON public.tour_analytics TO authenticated;
GRANT ALL ON public.rfis TO authenticated;
GRANT ALL ON public.submittals TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.punch_lists TO authenticated;
GRANT ALL ON public.daily_reports TO authenticated;
GRANT ALL ON public.model_processing_jobs TO authenticated;
GRANT ALL ON public.email_notifications TO authenticated;
-- =====================================================
-- DONE! Migration complete.
-- =====================================================;
