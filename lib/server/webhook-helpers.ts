// ---------------------------------------------------------------------------
// Shared helpers for Stripe webhook subscription processing.
// Extracted from webhook/route.ts to stay under 300-line limit.
// ---------------------------------------------------------------------------

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStandaloneAppId, CREDIT_ADDON_PACKS } from "@/lib/billing-apps";
import { addCredits } from "@/lib/credits/idempotency";

const GB = 1073741824;

/** Update the legacy platform tier + storage limit for an org. */
export async function updateOrganizationTier(orgId: string, tier: string) {
  const admin = createAdminClient();

  let storageLimitBytes = 2 * GB; // Default: Trial (2 GB)
  if (tier === "standard") storageLimitBytes = 25 * GB;
  else if (tier === "business") storageLimitBytes = 100 * GB;
  else if (tier === "enterprise") storageLimitBytes = 500 * GB;

  const updateTier = await admin
    .from("organizations")
    .update({ tier, storage_limit_bytes: storageLimitBytes })
    .eq("id", orgId);

  if (updateTier.error && /column .*tier.* does not exist/i.test(updateTier.error.message)) {
    await admin
      .from("organizations")
      .update({ plan: tier, storage_limit_bytes: storageLimitBytes })
      .eq("id", orgId);
  }
}

/** Upsert modular subscription state into org_app_subscriptions. */
export async function handleModularSubscription(
  orgId: string,
  sessionOrSub: Stripe.Checkout.Session | Stripe.Subscription,
  isActive: boolean,
) {
  const kind = sessionOrSub.metadata?.kind;
  if (!kind || (!kind.startsWith("modular_") && kind !== "storage_addon")) return;

  const planKey = sessionOrSub.metadata?.plan_key;
  if (!planKey) return;

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = {};

  if (kind === "modular_bundle") {
    updateData.bundle = isActive ? planKey.replace("bundle_", "") : null;
  } else if (kind === "storage_addon") {
    const gb = planKey === "storage_10gb" ? 10 : planKey === "storage_50gb" ? 50 : 0;
    updateData.storage_addon_gb = isActive ? gb : 0;
  } else if (kind === "modular_app") {
    const match = planKey.match(/^(.+)_(basic|pro)$/);
    if (match) {
      updateData[match[1]] = isActive ? match[2] : "none";
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await admin
      .from("org_app_subscriptions")
      .upsert({ org_id: orgId, ...updateData }, { onConflict: "org_id" });

    if (error) {
      console.error(`[webhook] Failed to update org_app_subscriptions for org=${orgId}:`, error.message);
    }
  }
}

/** Atomically add purchased credits via Supabase RPC. */
export async function addPurchasedCredits(orgId: string, creditAmount: number) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("add_purchased_credits", {
    p_org_id: orgId,
    p_amount: creditAmount,
  });
  if (error) {
    console.error(`[webhook] Failed to add credits for org=${orgId}:`, error.message);
  }
}

/** Toggle standalone app feature flag for an org. */
export async function upsertAppFlag(orgId: string, appId: "tour_builder" | "punchwalk" | "design_studio" | "content_studio", active: boolean) {
  const admin = createAdminClient();
  const FLAG_COL: Record<string, string> = {
    tour_builder: "standalone_tour_builder",
    punchwalk: "standalone_punchwalk",
    design_studio: "standalone_design_studio",
    content_studio: "standalone_content_studio",
  };
  const col = FLAG_COL[appId] ?? "standalone_punchwalk";

  const flagUpdate: Record<string, unknown> = { org_id: orgId, [col]: active };
  if (!active) {
    flagUpdate.downgraded_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("org_feature_flags")
    .upsert(flagUpdate, { onConflict: "org_id" });

  if (error) {
    console.error(`[webhook] Failed to upsert org_feature_flags for org=${orgId} app=${appId}:`, error.message);
  }

  // Standalone apps get minimum 2 GB — don't downgrade platform users
  if (active) {
    await admin
      .from("organizations")
      .update({ storage_limit_bytes: 2 * GB })
      .eq("id", orgId)
      .lt("storage_limit_bytes", 2 * GB);
  }
}

/** Resolve org_id from a Stripe customer's metadata. */
export async function resolveOrgIdFromCustomer(
  stripe: Stripe,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.org_id ?? null;
}

/** Process a credits_addon one-time purchase from checkout session. */
export async function processCreditsAddon(orgId: string, sessionId: string, planKey: string) {
  const addon = CREDIT_ADDON_PACKS.find((c) => c.id === planKey);
  if (addon && addon.credits > 0) {
    const idempotencyKey = `stripe_cs_${sessionId}`;
    const admin = createAdminClient();
    await addCredits(admin, orgId, addon.credits, idempotencyKey, `Purchased ${addon.credits} credits (${planKey})`);
  }
}
