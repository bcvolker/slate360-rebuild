-- 1. Create a generic updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the incorrect triggers that hallucinated the org_feature_flags function
DROP TRIGGER IF EXISTS trg_project_tours_updated_at ON public.project_tours;
DROP TRIGGER IF EXISTS trg_tour_scenes_updated_at ON public.tour_scenes;

-- 3. Create the correct triggers using the generic function
CREATE TRIGGER trg_project_tours_updated_at
  BEFORE UPDATE ON public.project_tours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tour_scenes_updated_at
  BEFORE UPDATE ON public.tour_scenes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
