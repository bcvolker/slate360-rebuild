import { NextRequest, NextResponse } from "next/server";
import { findOrCreateStripeCustomer, getAuthenticatedOrgContext } from "@/lib/billing-server";
import { isStandaloneAppId, getAppPriceId, type AppBillingCycle, type StandaloneAppId } from "@/lib/billing-apps";
import { getRequestOrigin, getStripeClient } from "@/lib/stripe";
import { loadOrgFeatureFlags } from "@/lib/server/org-feature-flags";

export const runtime = "nodejs";

/** Map app ID → the feature flag column that indicates an active subscription */
const APP_FLAG_KEY: Record<StandaloneAppId, "standalone_tour_builder" | "standalone_punchwalk"> = {
  tour_builder: "standalone_tour_builder",
  punchwalk: "standalone_punchwalk",
};

function getAppSuccessPath(appId: StandaloneAppId): string {
  if (appId === "tour_builder") {
    return "/tour-builder?welcome=true";
  }

  return "/site-walk?welcome=true";
}

export async function POST(req: NextRequest) {
  try {
    const orgContext = await getAuthenticatedOrgContext();
    if (orgContext.status !== 200) {
      return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
    }

    const body = await req.json().catch(() => ({}));
    const appId = typeof body.appId === "string" ? body.appId : null;
    const cycle: AppBillingCycle = "monthly"; // only monthly for now

    if (!isStandaloneAppId(appId)) {
      return NextResponse.json({ error: "Invalid app ID" }, { status: 400 });
    }

    // --- Double-billing guard: reject if org already owns this app ---
    const flags = await loadOrgFeatureFlags(orgContext.orgId);
    if (flags[APP_FLAG_KEY[appId]]) {
      return NextResponse.json(
        { error: "Your organization already has an active subscription to this app." },
        { status: 400 },
      );
    }

    const priceId = getAppPriceId(appId, cycle);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${appId}. Set STRIPE_PRICE_APP_${appId.toUpperCase()}_MONTHLY env var.` },
        { status: 400 },
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
      existingStripeCustomerId: orgContext.stripeCustomerId,
    });

    const origin = getRequestOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}${getAppSuccessPath(appId)}`,
      cancel_url: `${origin}/apps?app_billing=cancelled&app=${appId}`,
      metadata: {
        kind: "standalone_app",
        app_id: appId,
        org_id: orgContext.orgId,
        user_id: orgContext.user.id,
        billing_cycle: cycle,
      },
      subscription_data: {
        metadata: {
          kind: "standalone_app",
          app_id: appId,
          org_id: orgContext.orgId,
          user_id: orgContext.user.id,
          billing_cycle: cycle,
        },
      },
      client_reference_id: orgContext.user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/billing/app-checkout]", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
