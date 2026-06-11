-- Fix specific production error: "column unified_files.created_at does not exist"
-- This prevents the file explorer from rendering files.

-- 1. Add the column back (standard column expected by frontend)
ALTER TABLE IF EXISTS public.unified_files 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- 2. Backfill existing data
UPDATE public.unified_files 
SET created_at = COALESCE(uploaded_at, updated_at, NOW()) 
WHERE created_at IS NULL;
-- 3. Ensure index exists for performance if we sort by it
CREATE INDEX IF NOT EXISTS idx_unified_files_created_at ON public.unified_files(created_at);
