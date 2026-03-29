-- Create project_tours table
CREATE TABLE IF NOT EXISTS public.project_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  viewer_slug text UNIQUE,
  logo_asset_path text,
  logo_width_percent float,
  logo_opacity float,
  logo_position text CHECK (logo_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_project_tours_org ON public.project_tours(org_id);
CREATE INDEX idx_project_tours_project ON public.project_tours(project_id);
CREATE INDEX idx_project_tours_slug ON public.project_tours(viewer_slug);

-- Enable RLS for project_tours
ALTER TABLE public.project_tours ENABLE ROW LEVEL SECURITY;

-- Tour read policy: org members can read tours for their org
CREATE POLICY "org members can view tours" 
  ON public.project_tours FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = project_tours.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Tour edit policy: org members can edit tours for their org
CREATE POLICY "org members can edit tours" 
  ON public.project_tours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = project_tours.org_id
        AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = project_tours.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Create tour_scenes table
CREATE TABLE IF NOT EXISTS public.tour_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  panorama_path text NOT NULL,
  thumbnail_path text,
  initial_yaw float,
  initial_pitch float,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for ordering scenes
CREATE INDEX idx_tour_scenes_tour_order ON public.tour_scenes(tour_id, sort_order);

-- Enable RLS for tour_scenes
ALTER TABLE public.tour_scenes ENABLE ROW LEVEL SECURITY;

-- Scene policies (cascade from tour policies via JOIN)
CREATE POLICY "org members can view tour scenes"
  ON public.tour_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scenes.tour_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can edit tour scenes"
  ON public.tour_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scenes.tour_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      WHERE pt.id = tour_scenes.tour_id AND om.user_id = auth.uid()
    )
  );

-- Auto-update updated_at triggers
CREATE TRIGGER trg_project_tours_updated_at
  BEFORE UPDATE ON public.project_tours
  FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();

CREATE TRIGGER trg_tour_scenes_updated_at
  BEFORE UPDATE ON public.tour_scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_org_feature_flags_updated_at();
