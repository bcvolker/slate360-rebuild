import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierFromPriceId } from "@/lib/billing";
import { isStandaloneAppId } from "@/lib/billing-apps";
import { getStripeClient } from "@/lib/stripe";
import {
  updateOrganizationTier,
  handleModularSubscription,
  addPurchasedCredits,
  upsertAppFlag,
  resolveOrgIdFromCustomer,
  processCreditsAddon,
} from "@/lib/server/webhook-helpers";

export const runtime = "nodejs";

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

        if (session.mode === "subscription" && orgId) {
          if (kind === "standalone_app") {
            const appId = session.metadata?.app_id;
            console.log(`[webhook] Standalone app subscription: app=${appId} org=${orgId}`);
            if (isStandaloneAppId(appId)) {
              await upsertAppFlag(orgId, appId, true);
            }
          } else if (kind?.startsWith("modular_") || kind === "storage_addon") {
            console.log(`[webhook] Modular subscription: kind=${kind} planKey=${session.metadata?.plan_key} org=${orgId}`);
            await handleModularSubscription(orgId, session, true);
          } else {
            const targetTier = session.metadata?.target_tier;
            if (targetTier) {
              await updateOrganizationTier(orgId, targetTier);
            }
          }
        }

        if (session.mode === "payment" && orgId) {
           if (session.metadata?.kind === "credits") {
             const credits = Number(session.metadata?.credits ?? "0");
             if (Number.isFinite(credits) && credits > 0) {
               await addPurchasedCredits(orgId, credits);
             }
           } else if (session.metadata?.kind === "credits_addon") {
             const planKey = session.metadata?.plan_key;
             if (planKey) {
               await processCreditsAddon(orgId, session.id, planKey);
             }
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

        const isActive = subscription.status === "active" || subscription.status === "trialing";

        if (kind === "standalone_app") {
          const appId = subscription.metadata?.app_id;
          console.log(`[webhook] App subscription ${event.type}: app=${appId} org=${orgId} status=${subscription.status} active=${isActive}`);
          if (isStandaloneAppId(appId)) {
            await upsertAppFlag(orgId, appId, isActive);
          }
          break;
        }
        
        if (kind?.startsWith("modular_") || kind === "storage_addon") {
          console.log(`[webhook] Modular subscription ${event.type}: kind=${kind} org=${orgId} status=${subscription.status} active=${isActive}`);
          await handleModularSubscription(orgId, subscription, isActive);
          break;
        }

        if (subscription.status !== "active" && subscription.status !== "trialing") {
          if (subscription.status === "past_due") {
            console.log(`[webhook] Subscription past_due for org=${orgId} — keeping tier`);
            await admin
              .from("organizations")
              .update({ subscription_status: "past_due" })
              .eq("id", orgId);
          } else {
            console.log(`[webhook] Subscription ${subscription.status} for org=${orgId} — downgrading`);
            await Promise.all([
              updateOrganizationTier(orgId, "trial"),
              admin
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
          await admin
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
