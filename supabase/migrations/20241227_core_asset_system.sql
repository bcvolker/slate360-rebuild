-- =====================================================
-- CORE ASSET & PROCESSING SYSTEM
-- Comprehensive asset registry, digital twin versioning,
-- processing jobs, and credit ledger for Slate360
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- 1. ASSETS TABLE (Universal Asset Registry)
-- Every file, model, export, video, report = an asset
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Asset type classification
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'raw_upload',      -- Original uploaded file
    'image',           -- Processed image (JPG, PNG, WebP)
    'video',           -- Video file (MP4, MOV)
    'gaussian_splat',  -- 3D Gaussian Splat model
    'nerf',            -- Neural Radiance Field
    'mesh',            -- 3D Mesh (OBJ, FBX, GLB, GLTF)
    'pointcloud',      -- Point cloud (LAS, LAZ, PLY, E57)
    'pdf',             -- PDF document
    'cad',             -- CAD file (DWG, DXF, RVT)
    'bim',             -- BIM model (IFC)
    'report',          -- Generated report
    'tour',            -- 360 tour package
    'orthomosaic',     -- Drone orthomosaic
    'dsm',             -- Digital Surface Model
    'dtm',             -- Digital Terrain Model
    'thermal',         -- Thermal imagery
    'lidar',           -- LiDAR scan data
    'other'            -- Other file types
  )),
  
  -- File metadata
  name TEXT NOT NULL,
  description TEXT,
  s3_key TEXT NOT NULL,              -- S3/Storage path
  s3_bucket TEXT DEFAULT 'slate360-assets',
  content_type TEXT,                 -- MIME type
  size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum TEXT,                     -- MD5/SHA256 for integrity
  
  -- Processing metadata
  is_processed BOOLEAN DEFAULT false,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
    'pending', 'queued', 'processing', 'completed', 'failed', 'skipped'
  )),
  processing_job_id UUID,            -- Reference to processing job
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  is_latest BOOLEAN DEFAULT true,
  
  -- Access control
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  shared_with UUID[],                -- Array of user IDs with access
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Flexible metadata (dimensions, duration, etc.)
  tags TEXT[],                         -- Searchable tags
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ              -- Soft delete
);
-- Indexes for assets
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON public.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON public.assets(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_s3_key ON public.assets(s3_key);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON public.assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_metadata ON public.assets USING GIN(metadata);
-- =====================================================
-- 2. DIGITAL TWIN VERSIONS (Timeline & History)
-- Tracks versions of digital twins for projects
-- =====================================================
CREATE TABLE IF NOT EXISTS public.digital_twin_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Version info
  name TEXT NOT NULL,
  description TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Source data
  source_job_id UUID,                -- Processing job that created this version
  source_asset_ids UUID[],           -- Input assets used
  
  -- Primary outputs
  primary_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,  -- Main splat/mesh
  thumbnail_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  
  -- Related assets
  related_asset_ids UUID[],          -- All related outputs
  
  -- Quality metrics
  quality_score NUMERIC(5,2),        -- 0-100 quality rating
  metrics JSONB DEFAULT '{}'::jsonb, -- Processing metrics (resolution, accuracy, etc.)
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'processing', 'ready', 'published', 'archived'
  )),
  is_current BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_digital_twin_project ON public.digital_twin_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_org ON public.digital_twin_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_status ON public.digital_twin_versions(status);
-- Unique constraint for version number per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_twin_version_unique 
  ON public.digital_twin_versions(project_id, version_number);
-- =====================================================
-- 3. PROCESSING JOBS (Server-side Work Queue)
-- Tracks all processing tasks: splats, exports, renders
-- =====================================================
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Job type
  job_type TEXT NOT NULL CHECK (job_type IN (
    'gaussian_splat',     -- Create Gaussian Splat from images
    'nerf_training',      -- Train NeRF model
    'nerf_enhance',       -- Enhance existing NeRF
    'mesh_reconstruction',-- Generate mesh from point cloud
    'mesh_export',        -- Export mesh to different format
    'mesh_simplify',      -- Reduce mesh complexity
    'mesh_texture',       -- Apply/bake textures
    'pointcloud_process', -- Process point cloud
    'pointcloud_merge',   -- Merge multiple point clouds
    'video_render',       -- Render video from 3D scene
    'video_stabilize',    -- Stabilize video
    'image_enhance',      -- Enhance/upscale images
    'orthomosaic',        -- Create orthomosaic from drone images
    'dsm_generation',     -- Generate Digital Surface Model
    'floor_plan',         -- Extract floor plan from scan
    'measurement',        -- Generate measurements
    'report_generation',  -- Generate PDF report
    'tour_generation',    -- Create 360 tour
    'format_conversion',  -- Convert between formats
    'batch_upload',       -- Batch upload processing
    'other'
  )),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',     -- Waiting to start
    'assigned',   -- Assigned to worker
    'running',    -- Currently processing
    'paused',     -- Temporarily paused
    'completed',  -- Successfully finished
    'failed',     -- Processing failed
    'cancelled'   -- Cancelled by user
  )),
  
  -- Priority (higher = more urgent)
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- Input/Output
  input_asset_ids UUID[],            -- Source assets
  output_asset_ids UUID[],           -- Generated assets
  
  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,  -- Job-specific settings
  
  -- Resource usage
  gpu_minutes NUMERIC(10,2) DEFAULT 0,
  cpu_minutes NUMERIC(10,2) DEFAULT 0,
  memory_mb_peak INTEGER,
  
  -- Cost tracking
  credits_estimated NUMERIC(10,2),
  credits_used NUMERIC(10,2) DEFAULT 0,
  credits_reserved BOOLEAN DEFAULT false,
  
  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  current_step TEXT,
  total_steps INTEGER,
  current_step_number INTEGER,
  
  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Worker info
  worker_id TEXT,
  worker_region TEXT,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_processing_jobs_org ON public.processing_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project ON public.processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON public.processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_by ON public.processing_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_queued ON public.processing_jobs(queued_at) WHERE status = 'queued';
-- =====================================================
-- 4. CREDIT LEDGER (Single Source of Truth for Credits)
-- This is the ONLY table used to calculate credit balance
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Transaction details
  delta NUMERIC(12,2) NOT NULL,      -- Positive = add, Negative = consume
  running_balance NUMERIC(12,2),     -- Optional: denormalized balance after this transaction
  
  -- Classification
  reason TEXT NOT NULL,               -- Human readable reason
  category TEXT NOT NULL CHECK (category IN (
    'subscription',    -- Monthly/annual subscription allocation
    'purchase',        -- One-time credit purchase
    'bonus',           -- Promotional/referral bonus
    'refund',          -- Refund of unused credits
    'job_usage',       -- Processing job consumption
    'storage_usage',   -- Storage consumption
    'bandwidth_usage', -- Bandwidth consumption
    'export_usage',    -- Export/download consumption
    'api_usage',       -- API call consumption
    'adjustment',      -- Manual admin adjustment
    'expiration'       -- Credit expiration
  )),
  
  -- Reference to what caused this transaction
  ref_type TEXT,                     -- 'job', 'asset', 'export', 'purchase', etc.
  ref_id UUID,                       -- ID of the related record
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent modification after creation
  is_finalized BOOLEAN DEFAULT true
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_ledger_org ON public.credit_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created ON public.credit_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_category ON public.credit_ledger(category);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_ref ON public.credit_ledger(ref_type, ref_id);
-- =====================================================
-- 5. SUPPORTED FILE FORMATS (Reference Table)
-- Documents supported import/export formats
-- =====================================================
CREATE TABLE IF NOT EXISTS public.supported_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extension TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'image', 'video', '3d_model', 'pointcloud', 'cad', 'bim', 'document', 'archive', 'other'
  )),
  display_name TEXT NOT NULL,
  description TEXT,
  can_import BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  requires_processing BOOLEAN DEFAULT false,
  max_file_size_mb INTEGER,
  processing_credit_cost NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Populate supported formats
INSERT INTO public.supported_formats (extension, mime_type, category, display_name, can_import, can_export, requires_processing, processing_credit_cost) VALUES
  -- Images
  ('jpg', 'image/jpeg', 'image', 'JPEG Image', true, true, false, 0),
  ('jpeg', 'image/jpeg', 'image', 'JPEG Image', true, true, false, 0),
  ('png', 'image/png', 'image', 'PNG Image', true, true, false, 0),
  ('webp', 'image/webp', 'image', 'WebP Image', true, true, false, 0),
  ('tiff', 'image/tiff', 'image', 'TIFF Image', true, true, true, 1),
  ('heic', 'image/heic', 'image', 'HEIC Image', true, true, true, 0.5),
  ('raw', 'image/raw', 'image', 'RAW Image', true, false, true, 2),
  ('dng', 'image/x-adobe-dng', 'image', 'DNG Raw', true, false, true, 2),
  
  -- Video
  ('mp4', 'video/mp4', 'video', 'MP4 Video', true, true, false, 0),
  ('mov', 'video/quicktime', 'video', 'QuickTime Video', true, true, true, 5),
  ('avi', 'video/x-msvideo', 'video', 'AVI Video', true, false, true, 5),
  ('webm', 'video/webm', 'video', 'WebM Video', true, true, false, 0),
  
  -- 3D Models
  ('obj', 'model/obj', '3d_model', 'Wavefront OBJ', true, true, false, 0),
  ('fbx', 'application/octet-stream', '3d_model', 'Autodesk FBX', true, true, true, 2),
  ('glb', 'model/gltf-binary', '3d_model', 'glTF Binary', true, true, false, 0),
  ('gltf', 'model/gltf+json', '3d_model', 'glTF', true, true, false, 0),
  ('stl', 'model/stl', '3d_model', 'STL Model', true, true, false, 0),
  ('ply', 'application/x-ply', '3d_model', 'PLY Model', true, true, false, 0),
  ('3ds', 'application/x-3ds', '3d_model', '3DS Model', true, false, true, 2),
  ('dae', 'model/vnd.collada+xml', '3d_model', 'COLLADA', true, true, true, 1),
  ('usdz', 'model/vnd.usdz+zip', '3d_model', 'USDZ (AR)', true, true, true, 3),
  ('splat', 'application/x-gaussian-splat', '3d_model', 'Gaussian Splat', true, true, false, 0),
  
  -- Point Clouds
  ('las', 'application/vnd.las', 'pointcloud', 'LAS Point Cloud', true, true, true, 5),
  ('laz', 'application/vnd.laszip', 'pointcloud', 'LAZ Compressed', true, true, true, 5),
  ('e57', 'application/x-e57', 'pointcloud', 'E57 Point Cloud', true, true, true, 10),
  ('xyz', 'text/plain', 'pointcloud', 'XYZ Point Cloud', true, true, false, 0),
  ('pts', 'text/plain', 'pointcloud', 'PTS Point Cloud', true, true, true, 3),
  ('pcd', 'application/x-pcd', 'pointcloud', 'PCD Point Cloud', true, true, true, 3),
  
  -- CAD
  ('dwg', 'application/acad', 'cad', 'AutoCAD DWG', true, false, true, 10),
  ('dxf', 'application/dxf', 'cad', 'AutoCAD DXF', true, true, true, 5),
  ('step', 'application/step', 'cad', 'STEP File', true, true, true, 5),
  ('iges', 'application/iges', 'cad', 'IGES File', true, true, true, 5),
  ('skp', 'application/vnd.sketchup.skp', 'cad', 'SketchUp', true, false, true, 8),
  
  -- BIM
  ('ifc', 'application/x-step', 'bim', 'IFC (BIM)', true, true, true, 15),
  ('rvt', 'application/octet-stream', 'bim', 'Revit Project', true, false, true, 20),
  ('rfa', 'application/octet-stream', 'bim', 'Revit Family', true, false, true, 10),
  ('nwd', 'application/octet-stream', 'bim', 'Navisworks', true, false, true, 15),
  
  -- Documents
  ('pdf', 'application/pdf', 'document', 'PDF Document', true, true, false, 0),
  ('csv', 'text/csv', 'document', 'CSV Spreadsheet', true, true, false, 0),
  ('json', 'application/json', 'document', 'JSON Data', true, true, false, 0),
  
  -- Archives
  ('zip', 'application/zip', 'archive', 'ZIP Archive', true, true, false, 0),
  ('tar', 'application/x-tar', 'archive', 'TAR Archive', true, false, false, 0),
  ('7z', 'application/x-7z-compressed', 'archive', '7-Zip Archive', true, false, false, 0)
ON CONFLICT (extension) DO NOTHING;
-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twin_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_formats ENABLE ROW LEVEL SECURITY;
-- Assets: org members can view/manage
CREATE POLICY "Org members can view assets" ON public.assets
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Org members can create assets" ON public.assets
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Org members can update assets" ON public.assets
  FOR UPDATE USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Digital Twin Versions
CREATE POLICY "Org members can view twin versions" ON public.digital_twin_versions
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Processing Jobs
CREATE POLICY "Org members can view jobs" ON public.processing_jobs
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Org members can create jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Credit Ledger (read-only for regular users)
CREATE POLICY "Org members can view credit ledger" ON public.credit_ledger
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Supported Formats (public read)
CREATE POLICY "Anyone can view supported formats" ON public.supported_formats
  FOR SELECT USING (true);
-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to get organization's credit balance
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_org_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(delta), 0)
  FROM public.credit_ledger
  WHERE organization_id = p_org_id;
$$ LANGUAGE SQL STABLE;
-- Function to record credit usage
CREATE OR REPLACE FUNCTION public.record_credit_usage(
  p_org_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_category TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  INSERT INTO public.credit_ledger (
    organization_id, delta, reason, category, ref_type, ref_id, created_by
  ) VALUES (
    p_org_id, -ABS(p_amount), p_reason, p_category, p_ref_type, p_ref_id, p_user_id
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;
-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_org_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_category TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  INSERT INTO public.credit_ledger (
    organization_id, delta, reason, category, ref_type, ref_id, created_by
  ) VALUES (
    p_org_id, ABS(p_amount), p_reason, p_category, p_ref_type, p_ref_id, p_user_id
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;
-- Function to get asset storage used by org
CREATE OR REPLACE FUNCTION public.get_storage_used(p_org_id UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(size_bytes), 0)::BIGINT
  FROM public.assets
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;
-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Update updated_at on assets
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Update updated_at on digital_twin_versions
CREATE TRIGGER update_digital_twin_versions_updated_at
  BEFORE UPDATE ON public.digital_twin_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Update updated_at on processing_jobs
CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- DONE! Core asset system is ready.
-- =====================================================;;
