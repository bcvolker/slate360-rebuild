-- Add updated_at column to projects table if it doesn't exist
-- This column is required by the API for sorting

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Set initial values to match created_at
UPDATE public.projects 
SET updated_at = created_at 
WHERE updated_at IS NULL;
-- Add NOT NULL constraint
ALTER TABLE public.projects 
ALTER COLUMN updated_at SET NOT NULL;
-- Add trigger to auto-update on changes
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_updated_at_trigger ON public.projects;
CREATE TRIGGER projects_updated_at_trigger
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
-- Also add type column if missing (used in API mapping)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'construction';
-- Add data JSONB column if missing (stores extended project data)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
