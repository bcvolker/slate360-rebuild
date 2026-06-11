-- =====================================================
-- GUEST ACCESS FOR SLATEDROP SHARING
-- Add RPC function for token-based folder access
-- =====================================================

-- Create RPC function to get shared folder content via token
CREATE OR REPLACE FUNCTION public.get_shared_folder(token_input TEXT)
RETURNS TABLE (
  folder_id UUID,
  folder_name TEXT,
  folder_color TEXT,
  folder_icon TEXT,
  files JSONB,
  subfolders JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_record RECORD;
  folder_record RECORD;
BEGIN
  -- Verify token exists and is not expired
  SELECT sdl.* INTO link_record
  FROM public.slate_drop_links sdl
  WHERE sdl.token = token_input
  AND sdl.expires_at > NOW()
  AND sdl.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Get the target folder
  SELECT ff.* INTO folder_record
  FROM public.file_folders ff
  WHERE ff.id = link_record.folder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found';
  END IF;

  -- Return folder data with files and subfolders
  RETURN QUERY
  SELECT
    folder_record.id,
    folder_record.name,
    folder_record.color,
    folder_record.icon,
    -- Get files in this folder
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', uf.id,
          'name', uf.name,
          'size', uf.size,
          'type', uf.file_type,
          'url', uf.url,
          'uploaded_at', uf.created_at
        )
      ) FILTER (WHERE uf.id IS NOT NULL),
      '[]'::jsonb
    ) as files,
    -- Get subfolders
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', sub_ff.id,
          'name', sub_ff.name,
          'color', sub_ff.color,
          'icon', sub_ff.icon
        )
      ) FILTER (WHERE sub_ff.id IS NOT NULL),
      '[]'::jsonb
    ) as subfolders
  FROM public.file_folders ff
  LEFT JOIN public.unified_files uf ON uf.folder_id = ff.id AND uf.deleted_at IS NULL
  LEFT JOIN public.file_folders sub_ff ON sub_ff.parent_id = ff.id
  WHERE ff.id = folder_record.id
  GROUP BY ff.id, ff.name, ff.color, ff.icon;

END;
$$;
-- Grant execute permission to anonymous users (for sharing)
GRANT EXECUTE ON FUNCTION public.get_shared_folder(TEXT) TO anon;
</content>
<parameter name="filePath">/workspaces/AI-Slate360-Build/supabase/migrations/20260107_guest_folder_access.sql;
