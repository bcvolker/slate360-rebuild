-- Phase 10: Design Studio Foundation
-- Tables: project_models, model_files
-- Feature flag: standalone_design_studio on org_feature_flags

-- ============================================================
-- 1. Add standalone_design_studio flag to org_feature_flags
-- ============================================================
ALTER TABLE public.org_feature_flags
  ADD COLUMN IF NOT EXISTS standalone_design_studio boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. project_models — one row per design model
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_models (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  model_type  text NOT NULL DEFAULT 'generic' CHECK (model_type IN ('generic', 'bim', 'scan', 'cad')),
  thumbnail_path text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_models_org ON public.project_models(org_id);
CREATE INDEX IF NOT EXISTS idx_project_models_project ON public.project_models(project_id);

-- ============================================================
-- 3. model_files — files attached to a model (GLB, USDZ, IFC, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.model_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        uuid NOT NULL REFERENCES public.project_models(id) ON DELETE CASCADE,
  filename        text NOT NULL,
  s3_key          text NOT NULL,
  content_type    text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  file_role       text NOT NULL DEFAULT 'primary' CHECK (file_role IN ('primary', 'alternate', 'texture', 'reference')),
  sort_order      integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_files_model ON public.model_files(model_id);

-- ============================================================
-- 4. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_project_models_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_models_updated_at
  BEFORE UPDATE ON public.project_models
  FOR EACH ROW EXECUTE FUNCTION public.set_project_models_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE public.project_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_files ENABLE ROW LEVEL SECURITY;

-- project_models: org members can select/insert/update/delete
CREATE POLICY "org_members_select_models" ON public.project_models
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_insert_models" ON public.project_models
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_update_models" ON public.project_models
  FOR UPDATE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_delete_models" ON public.project_models
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

-- model_files: accessible if user can see the parent model
CREATE POLICY "org_members_select_model_files" ON public.model_files
  FOR SELECT USING (
    model_id IN (
      SELECT pm.id FROM public.project_models pm
      WHERE pm.org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
    )
  );

CREATE POLICY "org_members_insert_model_files" ON public.model_files
  FOR INSERT WITH CHECK (
    model_id IN (
      SELECT pm.id FROM public.project_models pm
      WHERE pm.org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
    )
  );

CREATE POLICY "org_members_delete_model_files" ON public.model_files
  FOR DELETE USING (
    model_id IN (
      SELECT pm.id FROM public.project_models pm
      WHERE pm.org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
    )
  );
