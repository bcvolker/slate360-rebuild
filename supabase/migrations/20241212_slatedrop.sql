-- =====================================================
-- SLATEDROP MIGRATION
-- Adds support for blind file uploads via shareable links
-- Run after main schema.sql
-- =====================================================

-- =====================================================
-- 1. PROJECT TEMPLATES TABLE
-- Save project settings as reusable templates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template data (JSON structure of project settings)
  template_data JSONB DEFAULT '{}'::jsonb,
  
  -- What's included
  include_budget BOOLEAN DEFAULT false,
  include_schedule BOOLEAN DEFAULT false,
  include_folders BOOLEAN DEFAULT true,
  include_team_roles BOOLEAN DEFAULT false,
  
  -- Display
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- Available to all orgs
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. PROJECT FOLDERS TABLE
-- Hierarchical folder structure for projects
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  
  -- Folder info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Folder type for categorization
  folder_type TEXT DEFAULT 'general', -- 'general', 'documents', 'drawings', 'photos', 'videos', 'models', 'slatedrop'
  
  -- Display
  icon TEXT DEFAULT 'folder',
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Permissions
  is_private BOOLEAN DEFAULT false,
  allowed_roles TEXT[] DEFAULT ARRAY['admin', 'owner', 'member'],
  
  -- Creator tracking
  created_by UUID REFERENCES public.profiles(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2B. PROJECT COST CODES TABLE
-- Cost codes for project budget tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_cost_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Cost code info
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'labor', 'materials', 'equipment', 'overhead', etc.
  
  -- Budget tracking
  budgeted_amount DECIMAL(15,2) DEFAULT 0,
  spent_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. SLATE DROP LINKS TABLE
-- Public tokens for blind file uploads
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slate_drop_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Scope: can be org-wide, project-specific, or folder-specific
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  
  -- Link info
  token TEXT NOT NULL UNIQUE, -- Public shareable token
  name TEXT NOT NULL, -- Display name for the link
  description TEXT,
  
  -- Access control
  password_hash TEXT, -- Optional password protection
  allowed_email_domains TEXT[], -- e.g., ['@company.com', '@partner.org']
  require_email BOOLEAN DEFAULT false,
  require_name BOOLEAN DEFAULT true,
  
  -- Upload settings
  max_file_size_bytes BIGINT DEFAULT 104857600, -- 100MB default
  max_total_size_bytes BIGINT DEFAULT 1073741824, -- 1GB default
  max_files INTEGER DEFAULT 100,
  allowed_file_types TEXT[], -- e.g., ['image/*', 'application/pdf', '.dwg']
  
  -- Auto-processing
  auto_process BOOLEAN DEFAULT false, -- Auto-queue for processing
  auto_tag TEXT[], -- Auto-apply tags to uploads
  
  -- Notifications
  notify_on_upload BOOLEAN DEFAULT true,
  notify_emails TEXT[],
  webhook_url TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 4. SLATE DROP UPLOADS TABLE
-- File metadata for uploads via SlateDrop
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slate_drop_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link reference
  slate_drop_link_id UUID REFERENCES public.slate_drop_links(id) ON DELETE SET NULL,
  
  -- Destination (resolved from link or explicit)
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL,
  
  -- Uploader info (anonymous or identified)
  uploader_name TEXT,
  uploader_email TEXT,
  uploader_ip TEXT,
  uploader_user_agent TEXT,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT, -- MIME type
  file_extension TEXT,
  file_size_bytes BIGINT NOT NULL,
  
  -- Storage reference
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  storage_bucket TEXT DEFAULT 'slatedrop',
  
  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_job_id UUID,
  processing_error TEXT,
  
  -- Processed asset reference
  asset_id UUID REFERENCES public.project_assets(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  notes TEXT,
  
  -- Review workflow
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  review_notes TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_project_templates_org_id ON public.project_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON public.project_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_project_folders_project_id ON public.project_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_folders_parent_id ON public.project_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_folders_folder_type ON public.project_folders(folder_type);
CREATE INDEX IF NOT EXISTS idx_project_cost_codes_project_id ON public.project_cost_codes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_cost_codes_code ON public.project_cost_codes(code);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_token ON public.slate_drop_links(token);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_org_id ON public.slate_drop_links(org_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_project_id ON public.slate_drop_links(project_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_folder_id ON public.slate_drop_links(folder_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_is_active ON public.slate_drop_links(is_active);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_link_id ON public.slate_drop_uploads(slate_drop_link_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_org_id ON public.slate_drop_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_project_id ON public.slate_drop_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_folder_id ON public.slate_drop_uploads(folder_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_status ON public.slate_drop_uploads(status);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_review_status ON public.slate_drop_uploads(review_status);
CREATE INDEX IF NOT EXISTS idx_slate_drop_uploads_uploaded_at ON public.slate_drop_uploads(uploaded_at);
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slate_drop_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slate_drop_uploads ENABLE ROW LEVEL SECURITY;
-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Members can view org templates" ON public.project_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.project_templates;
DROP POLICY IF EXISTS "Project members can view folders" ON public.project_folders;
DROP POLICY IF EXISTS "Project admins can manage folders" ON public.project_folders;
DROP POLICY IF EXISTS "Project members can view cost codes" ON public.project_cost_codes;
DROP POLICY IF EXISTS "Project admins can manage cost codes" ON public.project_cost_codes;
DROP POLICY IF EXISTS "Org members can view drop links" ON public.slate_drop_links;
DROP POLICY IF EXISTS "Admins can manage drop links" ON public.slate_drop_links;
DROP POLICY IF EXISTS "Org members can view uploads" ON public.slate_drop_uploads;
DROP POLICY IF EXISTS "Admins can manage uploads" ON public.slate_drop_uploads;
DROP POLICY IF EXISTS "Anyone can upload via valid link" ON public.slate_drop_uploads;
-- Project Templates: Org members can view, admins can edit
CREATE POLICY "Members can view org templates" ON public.project_templates
  FOR SELECT USING (
    is_public = true OR
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage templates" ON public.project_templates
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
-- Project Folders: Project members can view
CREATE POLICY "Project members can view folders" ON public.project_folders
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Project admins can manage folders" ON public.project_folders
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner', 'manager')
    )
  );
-- Project Cost Codes: Project members can view, admins can manage
CREATE POLICY "Project members can view cost codes" ON public.project_cost_codes
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
CREATE POLICY "Project admins can manage cost codes" ON public.project_cost_codes
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner', 'manager')
    )
  );
-- SlateDrop Links: Org members can view, admins can manage
CREATE POLICY "Org members can view drop links" ON public.slate_drop_links
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage drop links" ON public.slate_drop_links
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
-- SlateDrop Uploads: Org members can view
CREATE POLICY "Org members can view uploads" ON public.slate_drop_uploads
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage uploads" ON public.slate_drop_uploads
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );
-- Allow anonymous inserts for public drop links (via API)
CREATE POLICY "Anyone can upload via valid link" ON public.slate_drop_uploads
  FOR INSERT WITH CHECK (
    slate_drop_link_id IN (
      SELECT id FROM public.slate_drop_links 
      WHERE is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR current_uses < max_uses)
    )
  );
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Drop existing triggers (idempotent)
DROP TRIGGER IF EXISTS update_project_templates_updated_at ON public.project_templates;
DROP TRIGGER IF EXISTS update_project_folders_updated_at ON public.project_folders;
DROP TRIGGER IF EXISTS update_slate_drop_links_updated_at ON public.slate_drop_links;
DROP TRIGGER IF EXISTS update_slate_drop_uploads_updated_at ON public.slate_drop_uploads;
DROP TRIGGER IF EXISTS on_slate_drop_upload_increment ON public.slate_drop_uploads;
-- Trigger to update updated_at
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_folders_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slate_drop_links_updated_at
  BEFORE UPDATE ON public.slate_drop_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slate_drop_uploads_updated_at
  BEFORE UPDATE ON public.slate_drop_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to increment link usage count
CREATE OR REPLACE FUNCTION increment_slate_drop_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.slate_drop_links
  SET current_uses = current_uses + 1
  WHERE id = NEW.slate_drop_link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_slate_drop_upload_increment
  AFTER INSERT ON public.slate_drop_uploads
  FOR EACH ROW
  WHEN (NEW.slate_drop_link_id IS NOT NULL)
  EXECUTE FUNCTION increment_slate_drop_usage();
-- Function to generate a unique token for SlateDrop links
CREATE OR REPLACE FUNCTION generate_slate_drop_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
-- Function to create a new SlateDrop link
CREATE OR REPLACE FUNCTION create_slate_drop_link(
  p_org_id UUID,
  p_name TEXT,
  p_project_id UUID DEFAULT NULL,
  p_folder_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL,
  p_max_file_size_mb INTEGER DEFAULT 100
)
RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate unique token
  LOOP
    v_token := generate_slate_drop_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.slate_drop_links WHERE token = v_token);
  END LOOP;
  
  -- Calculate expiration
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
  END IF;
  
  -- Create the link
  INSERT INTO public.slate_drop_links (
    org_id, project_id, folder_id,
    token, name, description,
    expires_at, max_uses,
    max_file_size_bytes,
    created_by
  ) VALUES (
    p_org_id, p_project_id, p_folder_id,
    v_token, p_name, p_description,
    v_expires_at, p_max_uses,
    p_max_file_size_mb * 1024 * 1024,
    auth.uid()
  ) RETURNING id INTO v_link_id;
  
  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_slate_drop_token TO authenticated;
GRANT EXECUTE ON FUNCTION create_slate_drop_link TO authenticated;
-- =====================================================
-- DONE! SlateDrop tables are ready.
-- =====================================================;
