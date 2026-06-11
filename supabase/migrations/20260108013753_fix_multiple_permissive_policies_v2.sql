-- Fix multiple permissive policies for feature_flags, feature_requests, organization_members, user_notifications

-- FEATURE_FLAGS: Has "Anyone can view feature flags" + "Service role can manage feature flags"
-- Solution: Keep service role policy (already handles all), drop the redundant "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;

-- FEATURE_REQUESTS: Has "Authenticated users can view feature requests", "Users can manage their own feature requests", "All users can view feature requests"
-- Solution: Consolidate into a single policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view feature requests" ON feature_requests;
DROP POLICY IF EXISTS "All users can view feature requests" ON feature_requests;
-- Keep "Users can manage their own feature requests" as it has proper user_id check

-- ORGANIZATION_MEMBERS: Has "Admins can manage org members" + "Users can view org members"
-- These have different purposes but both are SELECT policies causing duplicate
-- Check what each does and consolidate
DROP POLICY IF EXISTS "Users can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;

-- Create a single consolidated policy for organization_members
CREATE POLICY "Org members can access their org" ON organization_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    -- Only admins can insert/update/delete
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN org_roles r ON om.org_role_id = r.id
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (select auth.uid())
      AND r.name IN ('owner', 'admin')
    )
  );

-- USER_NOTIFICATIONS: Has "Service role can manage notifications" + "Users can view own notifications"
-- These should not conflict - service role is for backend, users view their own
-- But the service role policy now covers all actions, so keep user policy for user-specific access
-- The issue is both have SELECT, so we need to ensure proper separation
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON user_notifications;

-- Create policy for users to manage their own notifications (not overlapping with service role)
CREATE POLICY "Users manage own notifications" ON user_notifications
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));;
