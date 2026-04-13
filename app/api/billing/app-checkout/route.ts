import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { findOrCreateStripeCustomer, getAuthenticatedOrgContext } from "@/lib/billing-server";
import { 
  getModularPlanFromPriceId, 
  getBundleFromPriceId, 
  getModularPriceId,
  BUNDLE_PLANS,
  STORAGE_ADDON_PLANS,
  CREDIT_ADDON_PACKS,
  isStandaloneAppId, 
  getAppPriceId, 
  type AppBillingCycle, 
  type StandaloneAppId 
} from "@/lib/billing-apps";
import type { AppId, AppTier } from "@/lib/entitlements-modular";
import { getRequestOrigin, getStripeClient } from "@/lib/stripe";
import { loadOrgFeatureFlags } from "@/lib/server/org-feature-flags";

export const runtime = "nodejs";

/** Map app ID → the feature flag column that indicates an active subscription */
const APP_FLAG_KEY: Record<StandaloneAppId, "standalone_tour_builder" | "standalone_punchwalk" | "standalone_design_studio" | "standalone_content_studio"> = {
  tour_builder: "standalone_tour_builder",
  punchwalk: "standalone_punchwalk",
  design_studio: "standalone_design_studio",
  content_studio: "standalone_content_studio",
};

function getAppSuccessPath(appId: StandaloneAppId | string): string {
  if (appId === "tour_builder") return "/tour-builder?welcome=true";
  if (appId === "site_walk") return "/site-walk?welcome=true";
  if (appId === "tours") return "/tours?welcome=true";
  return "/dashboard?welcome=true";
}

export async function POST(req: NextRequest) {
  try {
    const orgContext = await getAuthenticatedOrgContext();
    if (orgContext.status !== 200) {
      return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
    }

    const body = await req.json().catch(() => ({}));
    
    // Support either legacy appId OR modular planKey
    const appId = typeof body.appId === "string" ? body.appId : null;
    const planKey = typeof body.planKey === "string" ? body.planKey : null;
    const cycle: AppBillingCycle = "monthly"; // only monthly for now

    let priceId: string | null = null;
    let kind: string = "standalone_app";
    let metadata_app_id: string = "";
    let isOneTime = false;

    if (planKey) {
      // 1. Check if it's a bundle
      if (planKey.startsWith("bundle_")) {
        const bundleId = planKey.replace("bundle_", "");
        const bundle = BUNDLE_PLANS[bundleId as keyof typeof BUNDLE_PLANS];
        if (!bundle || !bundle.priceId) {
           return NextResponse.json({ error: `Invalid bundle or missing Stripe price ID for ${bundleId}` }, { status: 400 });
        }
        priceId = bundle.priceId;
        kind = "modular_bundle";
        metadata_app_id = bundleId;
      } 
      // 2. Check if it's a storage addon
      else if (planKey.startsWith("storage_")) {
        const addon = Object.values(STORAGE_ADDON_PLANS).find(a => a.id === planKey);
        if (!addon || !addon.priceId) {
           return NextResponse.json({ error: `Invalid storage addon or missing Stripe price ID for ${planKey}` }, { status: 400 });
        }
        priceId = addon.priceId;
        kind = "storage_addon";
        metadata_app_id = addon.id;
      }
      // 3. Check if it's a credit addon (one-time payment)
      else if (planKey.startsWith("credits_")) {
        const addon = CREDIT_ADDON_PACKS.find(c => c.id === planKey);
        if (!addon || !addon.priceId) {
           return NextResponse.json({ error: `Invalid credit addon or missing Stripe price ID for ${planKey}` }, { status: 400 });
        }
        priceId = addon.priceId;
        kind = "credits_addon";
        metadata_app_id = addon.id;
        isOneTime = true;
      }
      // 4. Must be a modular app plan (e.g. site_walk_pro)
      else {
        const match = planKey.match(/^(.+)_(basic|pro)$/);
        if (!match) {
          return NextResponse.json({ error: "Invalid planKey format" }, { status: 400 });
        }
        const parsedAppId = match[1] as AppId;
        const tier = match[2] as Exclude<AppTier, "none">;
        priceId = getModularPriceId(parsedAppId, tier);
        
        if (!priceId) {
          return NextResponse.json({ error: `Missing Stripe price for ${planKey}` }, { status: 400 });
        }
        kind = "modular_app";
        metadata_app_id = parsedAppId;
      }
    } else if (appId) {
      // Legacy path for standalone apps
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

      priceId = getAppPriceId(appId, cycle);
      if (!priceId) {
        return NextResponse.json(
          { error: `Missing Stripe price for ${appId}. Set STRIPE_PRICE_APP_${appId.toUpperCase()}_MONTHLY env var.` },
          { status: 400 },
        );
      }
      kind = "standalone_app";
      metadata_app_id = appId;
    } else {
      return NextResponse.json({ error: "Missing appId or planKey" }, { status: 400 });
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

    const sharedMetadata: Record<string, string> = {
      kind,
      app_id: metadata_app_id,
      org_id: orgContext.orgId,
      user_id: orgContext.user.id,
      billing_cycle: cycle,
      ...(planKey ? { plan_key: planKey } : {}),
    };
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isOneTime ? "payment" : "subscription",
      customer: customerId,
      line_items: [{ price: priceId!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}${getAppSuccessPath(metadata_app_id)}`,
      cancel_url: `${origin}/plans`,
      metadata: sharedMetadata,
      client_reference_id: orgContext.user.id,
      ...(isOneTime ? {} : { subscription_data: { metadata: sharedMetadata } }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/billing/app-checkout]", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
