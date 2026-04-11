import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierFromPriceId } from "@/lib/billing";
import { getAppFromPriceId, isStandaloneAppId } from "@/lib/billing-apps";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

async function updateOrganizationTier(orgId: string, tier: string) {
  const admin = createAdminClient();

  // Define tier limits (in bytes) — must match lib/entitlements.ts
  const GB = 1073741824;
  let storageLimitBytes = 2 * GB; // Default: Trial (2 GB)
  if (tier === "standard") storageLimitBytes = 25 * GB;
  else if (tier === "business") storageLimitBytes = 100 * GB;
  else if (tier === "enterprise") storageLimitBytes = 500 * GB;

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

  // Atomic increment — avoids read-add-write TOCTOU race.
  const { error } = await admin.rpc("add_purchased_credits", {
    p_org_id: orgId,
    p_amount: creditAmount,
  });

  if (error) {
    console.error(`[webhook] Failed to add credits for org=${orgId}:`, error.message);
  }
}

async function upsertAppFlag(orgId: string, appId: "tour_builder" | "punchwalk", active: boolean) {
  const admin = createAdminClient();
  const col = appId === "tour_builder" ? "standalone_tour_builder" : "standalone_punchwalk";

  const flagUpdate: Record<string, unknown> = { org_id: orgId, [col]: active };
  if (!active) {
    // Record the exact moment access was revoked so downstream logic can
    // gate grace-period behaviour and audit trails.
    flagUpdate.downgraded_at = new Date().toISOString();
  }

  // Upsert: insert a row with the flag, or update the existing flag column
  const { error } = await admin
    .from("org_feature_flags")
    .upsert(flagUpdate, { onConflict: "org_id" });

  if (error) {
    console.error(`[webhook] Failed to upsert org_feature_flags for org=${orgId} app=${appId}:`, error.message);
  }

  // Standalone apps get minimum 2 GB (trial baseline) — don't downgrade platform users
  if (active) {
    const GB = 1073741824;
    await admin
      .from("organizations")
      .update({ storage_limit_bytes: 2 * GB }) // 2 GB baseline for standalone
      .eq("id", orgId)
      // Only update if current limit is less than 2GB to prevent downgrading platform users
      .lt("storage_limit_bytes", 2 * GB);
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

  // ── Dedup: INSERT the event FIRST. If it already exists (PK conflict),
  // another handler already claimed it — return early.
  // This MUST happen BEFORE any mutations so that a crash mid-processing
  // doesn't leave an unrecorded event that Stripe will retry (causing
  // double mutations). The trade-off: if we crash after insert but before
  // completing mutations, Stripe won't retry. For idempotent mutations
  // (tier upserts, atomic credit adds) this is acceptable.
  const { error: dedupError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (dedupError) {
    // Unique violation = already processed; anything else = log and continue
    if (dedupError.code === "23505") {
      console.log(`[webhook] Event ${event.id} already processed.`);
      return NextResponse.json({ received: true });
    }
    console.error(`[webhook] Failed to record event ${event.id}:`, dedupError.message);
    // Non-PK error: still attempt processing (dedup is best-effort)
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
          const admin2 = createAdminClient();

          if (subscription.status === "past_due") {
            // Grace period: mark payment issue but keep access for now.
            // Stripe will retry payment per dunning settings. If it fails,
            // status will progress to "unpaid" or "canceled" and hit the
            // else branch below which actually downgrades.
            console.log(`[webhook] Subscription past_due for org=${orgId} — marking, keeping tier`);
            await admin2
              .from("organizations")
              .update({ subscription_status: "past_due" })
              .eq("id", orgId);
          } else {
            // unpaid, canceled, incomplete_expired — hard downgrade to trial
            console.log(`[webhook] Subscription ${subscription.status} for org=${orgId} — downgrading to trial`);
            await Promise.all([
              updateOrganizationTier(orgId, "trial"),
              admin2
                .from("organizations")
                .update({
                  downgraded_at: new Date().toISOString(),
                  subscription_status: subscription.status,
                })
                .eq("id", orgId),
            ]);
          }
          break;
        }

        const firstPriceId = subscription.items.data[0]?.price?.id;
        const mappedTier = getTierFromPriceId(firstPriceId);
        if (mappedTier) {
          await updateOrganizationTier(orgId, mappedTier);
          // Clear any past_due / downgraded status since sub is now active
          const admin3 = createAdminClient();
          await admin3
            .from("organizations")
            .update({ subscription_status: "active", downgraded_at: null })
            .eq("id", orgId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[api/stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
