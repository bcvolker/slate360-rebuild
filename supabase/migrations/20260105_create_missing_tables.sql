-- Create missing tables referenced in the code

-- 1. feature_requests
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_tier TEXT,
  description TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. processing_jobs
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id),
  file_id UUID REFERENCES public.unified_files(id),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  priority INTEGER DEFAULT 5,
  input_config JSONB DEFAULT '{}'::jsonb,
  output_config JSONB DEFAULT '{}'::jsonb,
  credits_estimated INTEGER DEFAULT 0,
  credits_actual INTEGER DEFAULT 0,
  result_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. credits
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  monthly_allocation INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);
-- 4. print_jobs
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id),
  file_id UUID REFERENCES public.unified_files(id),
  design_project_id UUID REFERENCES public.projects(id),
  status TEXT DEFAULT 'pending',
  preset TEXT DEFAULT 'standard',
  material TEXT DEFAULT 'pla',
  infill_percent INTEGER,
  layer_height_mm NUMERIC,
  supports_enabled BOOLEAN DEFAULT true,
  support_type TEXT,
  dimensions JSONB,
  estimated_time_minutes INTEGER,
  estimated_material_grams NUMERIC,
  gcode_url TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
-- Basic Policies (Permissive for now to ensure access)
CREATE POLICY "Enable all access for authenticated users" ON public.feature_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.processing_jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.credits FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.print_jobs FOR ALL TO authenticated USING (true);
