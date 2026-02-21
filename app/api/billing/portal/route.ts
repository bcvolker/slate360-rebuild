import { NextRequest, NextResponse } from "next/server";
import { findOrCreateStripeCustomer, getAuthenticatedOrgContext } from "@/lib/billing-server";
import { getRequestOrigin, getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const orgContext = await getAuthenticatedOrgContext();
    if (orgContext.status !== 200) {
      return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
    }

    const stripe = getStripeClient();
    const customerId = await findOrCreateStripeCustomer({
      stripe,
      email: orgContext.user.email ?? "",
      name: (orgContext.user.user_metadata?.full_name as string | undefined) ?? orgContext.orgName,
      orgId: orgContext.orgId,
      orgName: orgContext.orgName,
      userId: orgContext.user.id,
    });

    const origin = getRequestOrigin(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/billing/portal]", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
