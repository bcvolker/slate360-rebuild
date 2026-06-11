-- Add project deficiencies table (real persistence for DeficienciesList)

CREATE TABLE IF NOT EXISTS public.deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  location TEXT NOT NULL,
  assigned_to TEXT,
  due_date DATE,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deficiencies_project ON public.deficiencies(project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_org ON public.deficiencies(org_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_status ON public.deficiencies(status);
ALTER TABLE public.deficiencies ENABLE ROW LEVEL SECURITY;
-- Policies: follow the pattern of project management tables (org membership required)
DROP POLICY IF EXISTS "Users can view Deficiencies in their org" ON public.deficiencies;
CREATE POLICY "Users can view Deficiencies in their org" ON public.deficiencies
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can manage Deficiencies in their org" ON public.deficiencies;
CREATE POLICY "Users can manage Deficiencies in their org" ON public.deficiencies
  FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Updated_at trigger (reuse existing helper if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_deficiencies_updated_at ON public.deficiencies;
    CREATE TRIGGER update_deficiencies_updated_at
      BEFORE UPDATE ON public.deficiencies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
