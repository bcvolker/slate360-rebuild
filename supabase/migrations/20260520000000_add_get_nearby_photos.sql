-- Migration: 20260520000000_add_get_nearby_photos.sql
-- Description: Haversine distance locator for Ghost Mode/Before-After matches.

CREATE OR REPLACE FUNCTION get_nearby_photos(
    p_lat double precision,
    p_lng double precision,
    p_radius_meters double precision,
    p_org_id uuid
)
RETURNS SETOF site_walk_items
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM site_walk_items
    WHERE org_id = p_org_id
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (s3_key IS NOT NULL OR audio_s3_key IS NOT NULL OR file_id IS NOT NULL)
      AND (
          6371000 * acos(
              cos(radians(p_lat)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(p_lng)) +
              sin(radians(p_lat)) * sin(radians(latitude))
          )
      ) <= p_radius_meters
    ORDER BY
        (
            6371000 * acos(
                cos(radians(p_lat)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(latitude))
            )
        ) ASC;
END;
$$;