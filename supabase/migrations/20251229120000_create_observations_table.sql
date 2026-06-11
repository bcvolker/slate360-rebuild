-- Create observations table
CREATE TABLE IF NOT EXISTS public.project_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative', 'neutral')),
  location TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[],
  photos TEXT[]
);
-- Enable RLS
ALTER TABLE public.project_observations ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Members can view org observations" ON public.project_observations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Members can create observations" ON public.project_observations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Members can update observations" ON public.project_observations
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Members can delete observations" ON public.project_observations
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
-- Trigger for updated_at
CREATE TRIGGER update_project_observations_updated_at
  BEFORE UPDATE ON public.project_observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Index
CREATE INDEX IF NOT EXISTS idx_project_observations_project_id ON public.project_observations(project_id);
