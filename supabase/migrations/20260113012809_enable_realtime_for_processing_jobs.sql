-- Enable realtime for processing_jobs table
-- This allows the dashboard to receive live updates on job progress

-- First check if the table is already in the publication
DO $$
BEGIN
  -- Add processing_jobs to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'processing_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
  END IF;
END $$;

-- Also add model_processing_jobs for more detailed 3D model tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'model_processing_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE model_processing_jobs;
  END IF;
END $$;

-- Add unified_files for upload progress tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'unified_files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE unified_files;
  END IF;
END $$;

-- Verify the publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';;
