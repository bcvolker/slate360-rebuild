-- Add stripe_customer_id to organizations table
-- Eliminates email-based Stripe customer lookups that break on email changes / multi-admin orgs

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Unique constraint: one Stripe customer per organization
CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_id_key
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN organizations.stripe_customer_id IS
  'Stripe Customer ID (cus_xxx). Written on first checkout; used to skip email-based lookup.';
