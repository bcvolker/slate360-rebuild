import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierFromPriceId } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

async function updateOrganizationTier(orgId: string, tier: string) {
  const admin = createAdminClient();

  const updateTier = await admin
    .from("organizations")
    .update({ tier })
    .eq("id", orgId);

  if (updateTier.error && /column .*tier.* does not exist/i.test(updateTier.error.message)) {
    await admin
      .from("organizations")
      .update({ plan: tier })
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id ?? null;

        if (session.mode === "subscription" && orgId) {
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

        let orgId: string | null = subscription.metadata?.org_id || null;
        if (!orgId) {
          orgId = await resolveOrgIdFromCustomer(stripe, typeof subscription.customer === "string" ? subscription.customer : null);
        }
        if (!orgId) break;

        if (event.type === "customer.subscription.deleted") {
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[api/stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
