import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OrgRecord = {
  id?: string;
  name?: string;
  tier?: string;
  stripe_customer_id?: string | null;
};

type Membership = {
  org_id: string;
  organizations?: OrgRecord | OrgRecord[] | null;
};

export async function getAuthenticatedOrgContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("org_id, organizations(id,name,tier,stripe_customer_id)")
    .eq("user_id", user.id)
    .limit(1);

  if (error || !data || data.length === 0) {
    return { error: "Organization membership not found", status: 400 as const };
  }

  const member = data[0] as Membership;
  const orgRaw = member.organizations;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  return {
    status: 200 as const,
    user,
    orgId: member.org_id,
    orgName: org?.name ?? "Slate360 Organization",
    orgTier: org?.tier ?? "trial",
    stripeCustomerId: org?.stripe_customer_id ?? null,
  };
}

export async function findOrCreateStripeCustomer(params: {
  stripe: Stripe;
  email: string;
  name?: string;
  orgId: string;
  orgName: string;
  userId: string;
  existingStripeCustomerId?: string | null;
}): Promise<string> {
  const { stripe, email, name, orgId, orgName, userId, existingStripeCustomerId } = params;

  // 1. Fast path: org already has a saved Stripe customer ID
  if (existingStripeCustomerId) {
    return existingStripeCustomerId;
  }

  // 2. Fallback: search Stripe by email + metadata (legacy orgs without saved ID)
  const customers = await stripe.customers.list({ email, limit: 20 });
  const existing = customers.data.find(
    (customer) => customer.metadata?.org_id === orgId
  );

  const customerId = existing?.id
    ? existing.id
    : (
        await stripe.customers.create({
          email,
          name: name || orgName,
          metadata: { org_id: orgId, user_id: userId },
        })
      ).id;

  // 3. Persist the customer ID so future lookups skip the Stripe list call
  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ stripe_customer_id: customerId })
    .eq("id", orgId);

  return customerId;
}
