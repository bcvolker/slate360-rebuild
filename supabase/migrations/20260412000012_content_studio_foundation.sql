-- Phase 11: Content Studio Foundation
-- Tables: media_assets, media_collections
-- Feature flag: standalone_content_studio on org_feature_flags

-- ============================================================
-- 1. Add standalone_content_studio flag to org_feature_flags
-- ============================================================
ALTER TABLE public.org_feature_flags
  ADD COLUMN IF NOT EXISTS standalone_content_studio boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. media_collections — groupings of media assets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  cover_path  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_collections_org ON public.media_collections(org_id);
CREATE INDEX IF NOT EXISTS idx_media_collections_project ON public.media_collections(project_id);

-- ============================================================
-- 3. media_assets — individual media files (images, videos, docs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  collection_id   uuid REFERENCES public.media_collections(id) ON DELETE SET NULL,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text NOT NULL,
  s3_key          text NOT NULL,
  content_type    text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  media_type      text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  width           integer,
  height          integer,
  duration_secs   real,
  thumbnail_path  text,
  tags            text[] DEFAULT '{}',
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_org ON public.media_assets(org_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_collection ON public.media_assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type ON public.media_assets(org_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON public.media_assets USING gin(tags);

-- ============================================================
-- 4. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_media_collections_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_media_collections_updated_at
  BEFORE UPDATE ON public.media_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_media_collections_updated_at();

CREATE OR REPLACE FUNCTION public.set_media_assets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_media_assets_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE public.media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- media_collections RLS
CREATE POLICY "org_members_select_collections" ON public.media_collections
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_insert_collections" ON public.media_collections
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_update_collections" ON public.media_collections
  FOR UPDATE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_delete_collections" ON public.media_collections
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

-- media_assets RLS
CREATE POLICY "org_members_select_assets" ON public.media_assets
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_insert_assets" ON public.media_assets
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_update_assets" ON public.media_assets
  FOR UPDATE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "org_members_delete_assets" ON public.media_assets
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );
