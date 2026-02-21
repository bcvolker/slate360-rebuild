import { NextRequest, NextResponse } from "next/server";
import { findOrCreateStripeCustomer, getAuthenticatedOrgContext } from "@/lib/billing-server";
import { getCreditPack } from "@/lib/billing";
import { getRequestOrigin, getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const orgContext = await getAuthenticatedOrgContext();
    if (orgContext.status !== 200) {
      return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
    }

    const body = await req.json().catch(() => ({}));
    const packId = typeof body.packId === "string" ? body.packId : "starter";
    const pack = getCreditPack(packId);

    if (!pack?.priceId) {
      return NextResponse.json(
        { error: `Invalid credit pack or missing Stripe price. Set STRIPE_PRICE_CREDITS_${packId.toUpperCase()} env var.` },
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
      mode: "payment",
      customer: customerId,
      line_items: [{ price: pack.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?credits=success`,
      cancel_url: `${origin}/dashboard?credits=cancelled`,
      metadata: {
        kind: "credits",
        pack_id: pack.id,
        credits: String(pack.credits),
        org_id: orgContext.orgId,
        user_id: orgContext.user.id,
      },
      client_reference_id: orgContext.user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/billing/credits/checkout]", error);
    return NextResponse.json({ error: "Failed to create credit checkout session" }, { status: 500 });
  }
}
