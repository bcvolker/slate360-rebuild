import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCredits } from "@/lib/credits/idempotency";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";

export const runtime = "nodejs";

/**
 * C7: RevenueCat webhook — the server-side half of native StoreKit purchases.
 * RevenueCat validates the raw App Store/Play receipt itself (no hand-rolled
 * signature verification here); this route only needs to (1) confirm the
 * request actually came from RevenueCat via the shared secret configured in
 * the RevenueCat dashboard, and (2) grant credits exactly once per purchase.
 *
 * app_user_id is set to the org's id at Purchases.configure() time (see
 * lib/iap/revenuecat.ts), so it maps straight back to org_id with no separate
 * lookup table. Idempotency reuses the SAME credit_transactions.idempotency_key
 * mechanism the Stripe path uses (lib/credits/idempotency.ts) — no new table.
 *
 * Reference: docs/specs/STORE_IAP_ENTITLEMENTS.md §2 (receipt -> entitlement).
 */

type RevenueCatEvent = {
  type?: string;
  id?: string;
  app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  store?: string;
};

type RevenueCatWebhookBody = {
  event?: RevenueCatEvent;
};

// Consumable one-time purchases arrive as NON_RENEWING_PURCHASE. Other event
// types (renewals, cancellations, refunds) don't apply to credit packs and
// are acknowledged but ignored here.
const CREDIT_GRANT_EVENT_TYPES = new Set(["NON_RENEWING_PURCHASE", "TEST"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "Missing REVENUECAT_WEBHOOK_SECRET" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as RevenueCatWebhookBody | null;
  const event = body?.event;
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }

  if (!CREDIT_GRANT_EVENT_TYPES.has(event.type)) {
    // Not a credit-granting event (renewal/cancellation/refund/etc.) — no-op.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const orgId = event.app_user_id;
  if (!orgId || !isUuid(orgId)) {
    console.error(`[store-webhook] event ${event.id} has no valid app_user_id (org id)`);
    return NextResponse.json({ error: "Missing or invalid app_user_id" }, { status: 400 });
  }

  const pack = Object.values(CREDIT_PACKS).find((p) => p.iapProductId === event.product_id);
  if (!pack) {
    console.error(`[store-webhook] event ${event.id} has unknown product_id: ${event.product_id}`);
    return NextResponse.json({ error: "Unknown product_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const idempotencyKey = `iap:${event.id}`;
  const result = await addCredits(
    admin,
    orgId,
    pack.credits,
    idempotencyKey,
    `IAP purchase: ${pack.id} (${event.transaction_id ?? "no transaction id"})`,
  );

  if (!result.ok) {
    console.error(`[store-webhook] addCredits failed for event ${event.id}:`, result.error);
    return NextResponse.json({ error: result.error ?? "Failed to add credits" }, { status: 500 });
  }

  return NextResponse.json({ received: true, credited: pack.credits });
}
