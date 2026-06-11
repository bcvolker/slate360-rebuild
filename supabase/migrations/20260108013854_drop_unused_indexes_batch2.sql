-- Drop unused indexes - Batch 2 (model_processing_jobs, email_notifications, assets, digital_twin_versions, processing_jobs)

-- model_processing_jobs
DROP INDEX IF EXISTS idx_model_jobs_user_id;
DROP INDEX IF EXISTS idx_model_jobs_status;
DROP INDEX IF EXISTS idx_model_jobs_queued_at;
DROP INDEX IF EXISTS idx_model_processing_jobs_org_id;

-- email_notifications
DROP INDEX IF EXISTS idx_email_notifications_user_id;
DROP INDEX IF EXISTS idx_email_notifications_status;
DROP INDEX IF EXISTS idx_email_notifications_related;
DROP INDEX IF EXISTS idx_email_notifications_org_id;

-- assets
DROP INDEX IF EXISTS idx_assets_type;
DROP INDEX IF EXISTS idx_assets_created_by;
DROP INDEX IF EXISTS idx_assets_s3_key;
DROP INDEX IF EXISTS idx_assets_tags;
DROP INDEX IF EXISTS idx_assets_metadata;
DROP INDEX IF EXISTS idx_assets_parent_asset_id;

-- digital_twin_versions
DROP INDEX IF EXISTS idx_digital_twin_project;
DROP INDEX IF EXISTS idx_digital_twin_org;
DROP INDEX IF EXISTS idx_digital_twin_status;
DROP INDEX IF EXISTS idx_digital_twin_versions_created_by;
DROP INDEX IF EXISTS idx_digital_twin_versions_primary_asset_id;
DROP INDEX IF EXISTS idx_digital_twin_versions_thumbnail_asset_id;

-- processing_jobs
DROP INDEX IF EXISTS idx_processing_jobs_status;
DROP INDEX IF EXISTS idx_processing_jobs_type;
DROP INDEX IF EXISTS idx_processing_jobs_created_by;
DROP INDEX IF EXISTS idx_processing_jobs_queued;;
