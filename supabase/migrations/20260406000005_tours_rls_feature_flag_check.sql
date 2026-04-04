-- Migration: Tighten RLS on project_tours and tour_scenes
-- Requires org to have standalone_tour_builder = true in org_feature_flags
-- OR an org tier above 'trial' (full-platform subscribers get tours via entitlements).
--
-- Why: Previous policies only checked org membership, so any authenticated
-- org member — even after the tour_builder subscription expired — could
-- read/write tour data directly via Supabase client in the browser.
--
-- The service-role (admin) client used by API routes bypasses RLS entirely,
-- so these policies are the LAST line of defence against browser-level abuse.

-- Step 1: Drop the old permissive policies
DROP POLICY IF EXISTS "org members can view tours" ON public.project_tours;
DROP POLICY IF EXISTS "org members can edit tours" ON public.project_tours;
DROP POLICY IF EXISTS "org members can view tour scenes" ON public.tour_scenes;
DROP POLICY IF EXISTS "org members can edit tour scenes" ON public.tour_scenes;

-- Step 2: Recreate with feature-flag + tier check
-- A user can access tours if:
--   (a) they are an org member, AND
--   (b) their org has standalone_tour_builder = true  OR  org tier is NOT 'trial'
--       (non-trial tiers get tours as part of the platform subscription)

CREATE POLICY "org members with tour access can view tours"
  ON public.project_tours FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.org_id
      WHERE om.org_id = project_tours.org_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  );

CREATE POLICY "org members with tour access can edit tours"
  ON public.project_tours FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.org_id
      WHERE om.org_id = project_tours.org_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.org_id
      WHERE om.org_id = project_tours.org_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  );

CREATE POLICY "org members with tour access can view scenes"
  ON public.tour_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      JOIN public.organizations o ON o.id = om.org_id
      WHERE pt.id = tour_scenes.tour_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  );

CREATE POLICY "org members with tour access can edit scenes"
  ON public.tour_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      JOIN public.organizations o ON o.id = om.org_id
      WHERE pt.id = tour_scenes.tour_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_tours pt
      JOIN public.organization_members om ON om.org_id = pt.org_id
      JOIN public.organizations o ON o.id = om.org_id
      WHERE pt.id = tour_scenes.tour_id
        AND om.user_id = auth.uid()
        AND (
          o.tier IS DISTINCT FROM 'trial'
          OR EXISTS (
            SELECT 1 FROM public.org_feature_flags ff
            WHERE ff.org_id = om.org_id
              AND ff.standalone_tour_builder = true
          )
        )
    )
  );
