-- Add Design Studio versions table
-- Stores versioned snapshots of a Design Studio project (layers + camera)

CREATE TABLE IF NOT EXISTS public.design_studio_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_project_id UUID NOT NULL REFERENCES public.design_studio_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Version info
  name TEXT NOT NULL,
  description TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Version lineage
  base_version_id UUID REFERENCES public.design_studio_versions(id) ON DELETE SET NULL,

  -- Snapshot state
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_camera JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_studio_versions_design_project
  ON public.design_studio_versions(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_studio_versions_org
  ON public.design_studio_versions(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_studio_versions_unique
  ON public.design_studio_versions(design_project_id, version_number);
-- RLS
ALTER TABLE public.design_studio_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view org design versions" ON public.design_studio_versions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can manage org design versions" ON public.design_studio_versions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
-- Timestamps trigger (function exists in earlier migrations)
CREATE TRIGGER update_design_studio_versions_updated_at
  BEFORE UPDATE ON public.design_studio_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
GRANT ALL ON public.design_studio_versions TO authenticated;
