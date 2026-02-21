import { NextRequest, NextResponse } from "next/server";
import { findOrCreateStripeCustomer, getAuthenticatedOrgContext } from "@/lib/billing-server";
import { getSubscriptionPriceId, isPaidTier, type BillingCycle } from "@/lib/billing";
import { getRequestOrigin, getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const orgContext = await getAuthenticatedOrgContext();
    if (orgContext.status !== 200) {
      return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
    }

    const body = await req.json().catch(() => ({}));
    const tier = typeof body.tier === "string" ? body.tier : null;
    const cycle: BillingCycle = body.billingCycle === "annual" ? "annual" : "monthly";

    if (!isPaidTier(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const priceId = getSubscriptionPriceId(tier, cycle);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${tier} (${cycle}). Set STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()} env vars.` },
        { status: 400 }
      );
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
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/plans?billing=cancelled`,
      metadata: {
        kind: "subscription",
        org_id: orgContext.orgId,
        user_id: orgContext.user.id,
        target_tier: tier,
        billing_cycle: cycle,
      },
      subscription_data: {
        metadata: {
          kind: "subscription",
          org_id: orgContext.orgId,
          user_id: orgContext.user.id,
          target_tier: tier,
          billing_cycle: cycle,
        },
      },
      client_reference_id: orgContext.user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/billing/checkout]", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
