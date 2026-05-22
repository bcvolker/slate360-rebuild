-- Migration: 20260521000101_site_walk_active_items_nearby.sql
-- Ghost Mode: exclude soft-deleted items and add optional session/project scoping.

-- Remove legacy 4-arg overload so CREATE OR REPLACE is unambiguous.
DROP FUNCTION IF EXISTS public.get_nearby_photos(double precision, double precision, double precision, uuid);

CREATE OR REPLACE FUNCTION public.get_nearby_photos(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision,
  p_org_id uuid,
  p_project_id uuid DEFAULT NULL,
  p_session_id uuid DEFAULT NULL
)
RETURNS SETOF public.site_walk_items
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT i.*
  FROM public.site_walk_items i
  WHERE i.org_id = p_org_id
    AND i.deleted_at IS NULL
    AND i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND (i.s3_key IS NOT NULL OR i.audio_s3_key IS NOT NULL OR i.file_id IS NOT NULL)
    AND (p_project_id IS NULL OR i.project_id = p_project_id)
    AND (p_session_id IS NULL OR i.session_id = p_session_id)
    AND (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(i.latitude)) *
          cos(radians(i.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(i.latitude))
        ))
      )
    ) <= p_radius_meters
  ORDER BY
    (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(i.latitude)) *
          cos(radians(i.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(i.latitude))
        ))
      )
    ) ASC;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_photos(double precision, double precision, double precision, uuid, uuid, uuid) IS
  'Haversine lookup for Ghost Mode; excludes soft-deleted items. Optional project/session scope.';
