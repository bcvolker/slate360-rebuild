-- Track the live unified_files table in source control and add a direct bridge
-- from SlateDrop uploads to unified_files so share links can use the live FK.

CREATE TABLE IF NOT EXISTS public.unified_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  org_id uuid REFERENCES public.organizations(id),
  name text NOT NULL,
  original_name text,
  type text,
  mime_type text,
  size_bytes bigint,
  storage_key text NOT NULL,
  thumbnail_key text,
  preview_key text,
  source text DEFAULT 'slatedrop',
  linked_tabs text[],
  parent_folder_id uuid,
  folder_path text,
  status text DEFAULT 'pending',
  processing_progress integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  folder_id uuid,
  s3_bucket text,
  thumbnail_url text,
  file_type text,
  storage_bucket text DEFAULT 'uploads',
  processing_job_id uuid,
  processing_error text,
  credits_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.slatedrop_uploads
  ADD COLUMN IF NOT EXISTS unified_file_id uuid REFERENCES public.unified_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_unified_file_id
  ON public.slatedrop_uploads (unified_file_id)
  WHERE unified_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_files_storage_key
  ON public.unified_files (storage_key);

CREATE INDEX IF NOT EXISTS idx_unified_files_source_org
  ON public.unified_files (source, org_id);