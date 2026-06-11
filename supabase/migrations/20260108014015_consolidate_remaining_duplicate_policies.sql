-- Fix remaining multiple permissive policies issues

-- DOCUMENT_SIGNATURES: Consolidate the two INSERT policies into one
DROP POLICY IF EXISTS "Org members can access document signatures" ON document_signatures;
DROP POLICY IF EXISTS "Users can sign documents" ON document_signatures;

-- Single consolidated policy for document_signatures
CREATE POLICY "Org members can manage document signatures" ON document_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON d.org_id = om.org_id
      WHERE d.id = document_signatures.document_id
      AND om.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    -- Users can only create their own signatures
    signed_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON d.org_id = om.org_id
      WHERE d.id = document_signatures.document_id
      AND om.user_id = (select auth.uid())
    )
  );

-- USER_NOTIFICATIONS: Consolidate service role + user policies
-- Service role doesn't need user-level policies since it bypasses RLS
DROP POLICY IF EXISTS "Service role can manage notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users manage own notifications" ON user_notifications;

-- Single policy for users to manage their own notifications
-- Service role naturally bypasses RLS, so we don't need a separate policy
CREATE POLICY "Users can manage own notifications" ON user_notifications
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));;
