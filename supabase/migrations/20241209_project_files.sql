-- =====================================================
-- PROJECT FILES SCHEMA (SlateDrop Integration)
-- Run this in your Supabase SQL Editor
-- PREREQUISITE: Run supabase/schema.sql first to create
-- profiles, organizations, projects tables
-- =====================================================

-- =====================================================
-- 0. ENSURE PREREQUISITE TABLES EXIST
-- If these don't exist, run schema.sql first
-- =====================================================

-- Create profiles table if it doesn't exist (minimal version)
-- Note: The full schema.sql has REFERENCES auth.users(id), 
-- but for standalone migration we make it optional
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  company TEXT,
  job_title TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create organizations table if it doesn't exist (minimal version)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create projects table if it doesn't exist (minimal version)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create organization_members table if it doesn't exist (minimal version)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
-- =====================================================
-- 1. PROJECT_FILES TABLE
-- Stores file metadata for SlateDrop file system
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL DEFAULT '', -- e.g., "Project Documents/", "Drawings/Plans/"
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  s3_key TEXT NOT NULL, -- full S3 key under uploads/...
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public_link')),
  created_by UUID REFERENCES public.profiles(id),
  is_deleted BOOLEAN DEFAULT false, -- soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_org_id ON public.project_files(org_id);
CREATE INDEX IF NOT EXISTS idx_project_files_folder_path ON public.project_files(folder_path);
CREATE INDEX IF NOT EXISTS idx_project_files_s3_key ON public.project_files(s3_key);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON public.project_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_not_deleted ON public.project_files(is_deleted) WHERE is_deleted = false;
-- =====================================================
-- 2. PROJECT_FILE_LINKS TABLE
-- External share links for SlateDrop folders/files
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_file_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
  folder_path TEXT, -- if sharing a folder instead of file
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- unique share token
  link_type TEXT DEFAULT 'download' CHECK (link_type IN ('download', 'upload', 'view')),
  password_hash TEXT, -- optional password protection
  expires_at TIMESTAMPTZ,
  max_downloads INTEGER DEFAULT -1, -- -1 = unlimited
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_file_links_token ON public.project_file_links(token);
CREATE INDEX IF NOT EXISTS idx_project_file_links_file_id ON public.project_file_links(file_id);
CREATE INDEX IF NOT EXISTS idx_project_file_links_project_id ON public.project_file_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_file_links_active ON public.project_file_links(is_active) WHERE is_active = true;
-- =====================================================
-- 3. PROJECT_FOLDERS TABLE (Optional: explicit folder management)
-- For custom folder metadata beyond just paths
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL, -- full path e.g., "Drawings/Plans/"
  name TEXT NOT NULL, -- display name
  color TEXT, -- hex color for UI
  is_public BOOLEAN DEFAULT false,
  allow_upload BOOLEAN DEFAULT true,
  allow_download BOOLEAN DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, folder_path)
);
CREATE INDEX IF NOT EXISTS idx_project_folders_project_id ON public.project_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_folders_org_id ON public.project_folders(org_id);
-- =====================================================
-- 4. ORG_UPLOAD_LIMITS TABLE
-- Track daily upload counts per org (for trial limits)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.org_upload_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_count INTEGER DEFAULT 0,
  total_bytes_uploaded BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date)
);
CREATE INDEX IF NOT EXISTS idx_org_upload_limits_org_date ON public.org_upload_limits(org_id, date);
-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_file_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_upload_limits ENABLE ROW LEVEL SECURITY;
-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Project files: org members can access their org's files
DROP POLICY IF EXISTS "Members can view org project files" ON public.project_files;
CREATE POLICY "Members can view org project files" ON public.project_files
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can insert org project files" ON public.project_files;
CREATE POLICY "Members can insert org project files" ON public.project_files
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can update org project files" ON public.project_files;
CREATE POLICY "Members can update org project files" ON public.project_files
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- File links: org members can manage their org's share links
DROP POLICY IF EXISTS "Members can view org file links" ON public.project_file_links;
CREATE POLICY "Members can view org file links" ON public.project_file_links
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can create org file links" ON public.project_file_links;
CREATE POLICY "Members can create org file links" ON public.project_file_links
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Folders: org members can manage folders
DROP POLICY IF EXISTS "Members can view org folders" ON public.project_folders;
CREATE POLICY "Members can view org folders" ON public.project_folders
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Members can manage org folders" ON public.project_folders;
CREATE POLICY "Members can manage org folders" ON public.project_folders
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Upload limits: org members can view their limits
DROP POLICY IF EXISTS "Members can view org upload limits" ON public.org_upload_limits;
CREATE POLICY "Members can view org upload limits" ON public.org_upload_limits
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Update timestamp trigger for project_files
DROP TRIGGER IF EXISTS update_project_files_updated_at ON public.project_files;
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Update timestamp trigger for project_file_links
DROP TRIGGER IF EXISTS update_project_file_links_updated_at ON public.project_file_links;
CREATE TRIGGER update_project_file_links_updated_at
  BEFORE UPDATE ON public.project_file_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Update timestamp trigger for project_folders
DROP TRIGGER IF EXISTS update_project_folders_updated_at ON public.project_folders;
CREATE TRIGGER update_project_folders_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to increment daily upload count
CREATE OR REPLACE FUNCTION increment_daily_upload_count(
  p_org_id UUID,
  p_bytes BIGINT DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.org_upload_limits (org_id, date, upload_count, total_bytes_uploaded)
  VALUES (p_org_id, CURRENT_DATE, 1, p_bytes)
  ON CONFLICT (org_id, date) DO UPDATE
  SET 
    upload_count = org_upload_limits.upload_count + 1,
    total_bytes_uploaded = org_upload_limits.total_bytes_uploaded + p_bytes,
    updated_at = NOW()
  RETURNING upload_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get daily upload count
CREATE OR REPLACE FUNCTION get_daily_upload_count(p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT upload_count INTO v_count
  FROM public.org_upload_limits
  WHERE org_id = p_org_id AND date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get folder file counts
CREATE OR REPLACE FUNCTION get_project_folder_stats(p_project_id UUID)
RETURNS TABLE (
  folder_path TEXT,
  file_count BIGINT,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf.folder_path,
    COUNT(*)::BIGINT as file_count,
    COALESCE(SUM(pf.size_bytes), 0)::BIGINT as total_size
  FROM public.project_files pf
  WHERE pf.project_id = p_project_id AND pf.is_deleted = false
  GROUP BY pf.folder_path
  ORDER BY pf.folder_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- 9. GRANTS
-- =====================================================
GRANT ALL ON public.project_files TO authenticated;
GRANT ALL ON public.project_file_links TO authenticated;
GRANT ALL ON public.project_folders TO authenticated;
GRANT SELECT ON public.org_upload_limits TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_upload_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_upload_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_folder_stats TO authenticated;
-- =====================================================
-- DONE! Project files schema ready.
-- =====================================================;
