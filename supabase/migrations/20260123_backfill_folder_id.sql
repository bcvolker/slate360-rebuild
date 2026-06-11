-- ============================================================================
-- SAFETY MIGRATION: Backfill folder_id from parent_folder_id
-- ============================================================================
-- Purpose: Standardize folder identity to use unified_files.folder_id as canonical
-- 
-- This migration:
--   1. Backfills folder_id from parent_folder_id where folder_id is NULL
--   2. Does NOT drop parent_folder_id (for rollback safety)
--   3. Logs affected rows for audit trail
--
-- Run this AFTER deploying code changes that write to folder_id
-- ============================================================================

-- Transaction wrapper for safety
BEGIN;
-- ============================================================================
-- 1. Audit: Count rows that need backfill
-- ============================================================================
DO $$
DECLARE
  needs_backfill INTEGER;
  already_has_folder_id INTEGER;
  both_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO needs_backfill
  FROM unified_files
  WHERE folder_id IS NULL 
    AND parent_folder_id IS NOT NULL;
    
  SELECT COUNT(*) INTO already_has_folder_id
  FROM unified_files
  WHERE folder_id IS NOT NULL;
    
  SELECT COUNT(*) INTO both_null
  FROM unified_files
  WHERE folder_id IS NULL 
    AND parent_folder_id IS NULL;
    
  RAISE NOTICE '=== Folder ID Backfill Audit ===';
  RAISE NOTICE 'Rows with folder_id already set: %', already_has_folder_id;
  RAISE NOTICE 'Rows needing backfill (parent_folder_id -> folder_id): %', needs_backfill;
  RAISE NOTICE 'Rows with both NULL (root files): %', both_null;
END $$;
-- ============================================================================
-- 2. Backfill: Copy parent_folder_id to folder_id where folder_id is NULL
-- ============================================================================
UPDATE unified_files
SET 
  folder_id = parent_folder_id,
  updated_at = NOW()
WHERE folder_id IS NULL 
  AND parent_folder_id IS NOT NULL;
-- ============================================================================
-- 3. Verify: Count rows after backfill
-- ============================================================================
DO $$
DECLARE
  remaining_needs_backfill INTEGER;
  total_with_folder_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_needs_backfill
  FROM unified_files
  WHERE folder_id IS NULL 
    AND parent_folder_id IS NOT NULL;
    
  SELECT COUNT(*) INTO total_with_folder_id
  FROM unified_files
  WHERE folder_id IS NOT NULL;
    
  RAISE NOTICE '=== Post-Backfill Verification ===';
  RAISE NOTICE 'Remaining rows needing backfill: %', remaining_needs_backfill;
  RAISE NOTICE 'Total rows with folder_id: %', total_with_folder_id;
  
  IF remaining_needs_backfill > 0 THEN
    RAISE WARNING 'Some rows were not backfilled! Check for concurrent writes.';
  ELSE
    RAISE NOTICE 'Backfill complete. All rows with parent_folder_id now have folder_id.';
  END IF;
END $$;
-- ============================================================================
-- 4. Add index on folder_id for query performance (if not exists)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_files_folder_id 
  ON unified_files(folder_id);
-- ============================================================================
-- 5. Add comment documenting canonical usage
-- ============================================================================
COMMENT ON COLUMN unified_files.folder_id IS 
  'CANONICAL: Primary folder association. Use this column for queries and writes.';
COMMENT ON COLUMN unified_files.parent_folder_id IS 
  'LEGACY: Deprecated. Kept for rollback safety. New code should use folder_id.';
COMMIT;
-- ============================================================================
-- OPTIONAL: Future migration to drop parent_folder_id
-- ============================================================================
-- Uncomment and run this AFTER confirming all code uses folder_id:
--
-- BEGIN;
-- ALTER TABLE unified_files DROP COLUMN IF EXISTS parent_folder_id;
-- COMMIT;
--
-- ============================================================================;
