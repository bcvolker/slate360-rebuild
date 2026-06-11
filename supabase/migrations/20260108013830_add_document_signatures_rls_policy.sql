-- Add RLS policy for document_signatures table (currently has RLS enabled but no policies)
-- document_signatures links to documents via document_id, and documents has org_id

-- Policy: Users can access signatures for documents in their org
CREATE POLICY "Org members can access document signatures" ON document_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON d.org_id = om.org_id
      WHERE d.id = document_signatures.document_id
      AND om.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON d.org_id = om.org_id
      WHERE d.id = document_signatures.document_id
      AND om.user_id = (select auth.uid())
    )
  );

-- Allow users to sign documents (insert their own signatures)
CREATE POLICY "Users can sign documents" ON document_signatures
  FOR INSERT WITH CHECK (
    signed_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON d.org_id = om.org_id
      WHERE d.id = document_signatures.document_id
      AND om.user_id = (select auth.uid())
    )
  );;
