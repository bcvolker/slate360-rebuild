import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierFromPriceId } from "@/lib/billing";
import { getAppFromPriceId, isStandaloneAppId } from "@/lib/billing-apps";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

async function updateOrganizationTier(orgId: string, tier: string) {
  const admin = createAdminClient();

  // Define tier limits (in bytes)
  const GB = 1073741824;
  let storageLimitBytes = 5 * GB; // Default: Trial (5 GB)
  if (tier === "creator") storageLimitBytes = 40 * GB;
  else if (tier === "model") storageLimitBytes = 150 * GB;
  else if (tier === "business") storageLimitBytes = 750 * GB;
  else if (tier === "enterprise") storageLimitBytes = 5000 * GB;

  const updateTier = await admin
    .from("organizations")
    .update({ 
      tier,
      storage_limit_bytes: storageLimitBytes 
    })
    .eq("id", orgId);

  if (updateTier.error && /column .*tier.* does not exist/i.test(updateTier.error.message)) {
    await admin
      .from("organizations")
      .update({ 
        plan: tier,
        storage_limit_bytes: storageLimitBytes 
      })
      .eq("id", orgId);
  }
}

async function addPurchasedCredits(orgId: string, creditAmount: number) {
  const admin = createAdminClient();

  const current = await admin
    .from("organizations")
    .select("credits_balance")
    .eq("id", orgId)
    .single();

  if (current.error) {
    return;
  }

  const existingBalance = Number((current.data as { credits_balance?: number } | null)?.credits_balance ?? 0);
  await admin
    .from("organizations")
    .update({ credits_balance: existingBalance + creditAmount })
    .eq("id", orgId);
}

async function upsertAppFlag(orgId: string, appId: "tour_builder" | "punchwalk", active: boolean) {
  const admin = createAdminClient();
  const col = appId === "tour_builder" ? "standalone_tour_builder" : "standalone_punchwalk";

  // Upsert: insert a row with the flag, or update the existing flag column
  const { error } = await admin
    .from("org_feature_flags")
    .upsert(
      { org_id: orgId, [col]: active },
      { onConflict: "org_id" },
    );

  if (error) {
    console.error(`[webhook] Failed to upsert org_feature_flags for org=${orgId} app=${appId}:`, error.message);
  }

  // Update storage limit for standalone apps if they are active
  // Assume: Standalone Tour Builder gets 5GB, Punchwalk gets 5GB.
  // Wait, Content Studio might get 100GB later. For now we just ensure they have at least 5GB.
  if (active) {
    const GB = 1073741824;
    await admin
      .from("organizations")
      .update({ storage_limit_bytes: 5 * GB }) // 5 GB limit for standalone
      .eq("id", orgId)
      // Only update if current limit is less than 5GB to prevent downgrading platform users
      .lt("storage_limit_bytes", 5 * GB);
  }
}

async function resolveOrgIdFromCustomer(stripe: Stripe, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.org_id ?? null;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripeClient();
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingEvent } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();

  if (existingEvent) {
    console.log(`[webhook] Event ${event.id} already processed.`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id ?? null;
        const kind = session.metadata?.kind ?? null;

        if (session.mode === "subscription" && orgId && kind === "standalone_app") {
          const appId = session.metadata?.app_id;
          console.log(`[webhook] Standalone app subscription: app=${appId} org=${orgId}`);
          if (isStandaloneAppId(appId)) {
            await upsertAppFlag(orgId, appId, true);
          }
        }

        if (session.mode === "subscription" && orgId && kind !== "standalone_app") {
          const targetTier = session.metadata?.target_tier;
          if (targetTier) {
            await updateOrganizationTier(orgId, targetTier);
          }
        }

        if (session.mode === "payment" && orgId && session.metadata?.kind === "credits") {
          const credits = Number(session.metadata?.credits ?? "0");
          if (Number.isFinite(credits) && credits > 0) {
            await addPurchasedCredits(orgId, credits);
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const kind = subscription.metadata?.kind ?? null;

        let orgId: string | null = subscription.metadata?.org_id || null;
        if (!orgId) {
          orgId = await resolveOrgIdFromCustomer(stripe, typeof subscription.customer === "string" ? subscription.customer : null);
        }
        if (!orgId) break;

        if (kind === "standalone_app") {
          const appId = subscription.metadata?.app_id;
          // Sub is active only if status is 'active' or 'trialing'
          // 'past_due', 'unpaid', 'canceled', etc mean no access
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          console.log(`[webhook] App subscription ${event.type}: app=${appId} org=${orgId} status=${subscription.status} active=${isActive}`);
          if (isStandaloneAppId(appId)) {
            await upsertAppFlag(orgId, appId, isActive);
          }
          break;
        }

        if (subscription.status !== "active" && subscription.status !== "trialing") {
          // If a platform tier sub fails/cancels, drop them to trial
          await updateOrganizationTier(orgId, "trial");
          break;
        }

        const firstPriceId = subscription.items.data[0]?.price?.id;
        const mappedTier = getTierFromPriceId(firstPriceId);
        if (mappedTier) {
          await updateOrganizationTier(orgId, mappedTier);
        }
        break;
      }

      default:
        break;
    }

    // Record the event to prevent duplicate processing
    await admin.from("stripe_events").insert({ id: event.id, type: event.type });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[api/stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
