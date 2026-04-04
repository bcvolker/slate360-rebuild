-- Add artifact_upload_id FK to project_rfis and project_submittals
-- Enables S3 cleanup when deleting RFIs/Submittals

ALTER TABLE project_rfis
  ADD COLUMN IF NOT EXISTS artifact_upload_id UUID
    REFERENCES slatedrop_uploads(id) ON DELETE SET NULL;

ALTER TABLE project_submittals
  ADD COLUMN IF NOT EXISTS artifact_upload_id UUID
    REFERENCES slatedrop_uploads(id) ON DELETE SET NULL;
