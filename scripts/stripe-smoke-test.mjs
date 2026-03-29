#!/usr/bin/env node
/**
 * Stripe Platform Billing Smoke Test — Phase 1A
 *
 * Tests:
 *  1. STRIPE_SECRET_KEY is valid (list products)
 *  2. All subscription price IDs resolve to real Stripe prices
 *  3. STRIPE_WEBHOOK_SECRET is set
 *  4. Webhook handler at /api/stripe/webhook returns 400 on bad sig (not 500/404)
 *  5. Checkout endpoint at /api/billing/checkout returns expected error for unauthed
 *
 * Run:  node scripts/stripe-smoke-test.mjs
 * Requires: dev server running at localhost:3000
 */

import Stripe from "stripe";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// Always use localhost for local smoke testing, regardless of NEXT_PUBLIC_APP_URL
const BASE = process.env.STRIPE_SMOKE_TEST_BASE || "http://localhost:3000";
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); failures.push(msg); };
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const failures = [];

async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Stripe Platform Billing — Smoke Test");
  console.log("══════════════════════════════════════════\n");

  // ── Test 1: STRIPE_SECRET_KEY ──────────────────────────────────────────
  console.log("1. Stripe API Key");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    fail("STRIPE_SECRET_KEY is not set in .env.local");
    return summarize();
  }
  if (secretKey.startsWith('"') || secretKey.endsWith('"')) {
    warn("STRIPE_SECRET_KEY has surrounding quotes — dotenv may handle this, but verify");
  }
  const isTestMode = secretKey.startsWith("sk_test_");
  const isLiveMode = secretKey.startsWith("sk_live_");
  if (!isTestMode && !isLiveMode) {
    fail(`STRIPE_SECRET_KEY has unexpected prefix: ${secretKey.substring(0, 10)}...`);
    return summarize();
  }
  pass(`Key loaded (${isTestMode ? "TEST mode" : "LIVE mode"})`);

  let stripe;
  try {
    stripe = new Stripe(secretKey);
    const acct = await stripe.accounts.retrieve();
    pass(`Stripe account connected: ${acct.settings?.dashboard?.display_name || acct.id}`);
  } catch (err) {
    fail(`Stripe API connection failed: ${err.message}`);
    return summarize();
  }

  // ── Test 2: Subscription Price IDs ─────────────────────────────────────
  console.log("\n2. Subscription Price IDs");

  const priceVars = [
    "STRIPE_PRICE_CREATOR_MONTHLY",
    "STRIPE_PRICE_CREATOR_ANNUAL",
    "STRIPE_PRICE_MODEL_MONTHLY",
    "STRIPE_PRICE_MODEL_ANNUAL",
    "STRIPE_PRICE_BUSINESS_MONTHLY",
    "STRIPE_PRICE_BUSINESS_ANNUAL",
  ];

  for (const varName of priceVars) {
    let val = process.env[varName];
    // Strip surrounding quotes if present
    if (val && val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    if (!val) {
      fail(`${varName} is not set`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(val);
      const product = typeof price.product === "string"
        ? await stripe.products.retrieve(price.product)
        : price.product;
      const name = product?.name || "unknown";
      const amount = price.unit_amount
        ? `$${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || "?"}`
        : "custom";
      pass(`${varName} → ${name} (${amount})`);
    } catch (err) {
      fail(`${varName} = ${val} — Stripe error: ${err.message}`);
    }
  }

  // ── Test 3: STRIPE_WEBHOOK_SECRET ──────────────────────────────────────
  console.log("\n3. Webhook Secret");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whsec) {
    fail("STRIPE_WEBHOOK_SECRET is not set");
  } else if (typeof whsec === "string" && (whsec.replace(/"/g, "").startsWith("whsec_"))) {
    pass("STRIPE_WEBHOOK_SECRET is set (whsec_... format)");
  } else {
    warn(`STRIPE_WEBHOOK_SECRET has unexpected prefix: ${whsec.substring(0, 10)}...`);
  }

  // ── Test 4: Webhook endpoint responds correctly ────────────────────────
  console.log("\n4. Webhook Endpoint (/api/stripe/webhook)");
  try {
    // POST with invalid signature should return 400, not 404 or 500
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "invalid_signature_for_test",
      },
      body: JSON.stringify({ type: "test" }),
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 400) {
      pass(`Webhook returns 400 on bad signature (correct behavior)`);
      if (body.error) pass(`Error message: "${body.error}"`);
    } else if (res.status === 404) {
      fail("Webhook returned 404 — route may not exist or may not be compiled");
    } else if (res.status === 500) {
      fail(`Webhook returned 500 — likely missing STRIPE_WEBHOOK_SECRET or crash: ${body.error || "unknown"}`);
    } else {
      warn(`Webhook returned unexpected status ${res.status}: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    fail(`Could not reach webhook endpoint: ${err.message}. Is the dev server running at ${BASE}?`);
  }

  // ── Test 5: Checkout endpoint (unauthed → 401) ────────────────────────
  console.log("\n5. Checkout Endpoint (/api/billing/checkout)");
  try {
    const res = await fetch(`${BASE}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "creator", billingCycle: "monthly" }),
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 401) {
      pass("Checkout correctly rejects unauthenticated request (401)");
    } else if (res.status === 400 && body.error?.includes("Organization")) {
      pass("Checkout rejects — can't find org for unauthenticated user (expected)");
    } else if (res.status === 200 && body.url) {
      warn("Checkout returned a session URL — this should only happen for authenticated users");
    } else {
      warn(`Checkout returned ${res.status}: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    fail(`Could not reach checkout endpoint: ${err.message}`);
  }

  // ── Test 6: Billing portal endpoint (unauthed → 401) ──────────────────
  console.log("\n6. Billing Portal (/api/billing/portal)");
  try {
    const res = await fetch(`${BASE}/api/billing/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 401) {
      pass("Portal correctly rejects unauthenticated request (401)");
    } else if (res.status === 400) {
      pass("Portal rejects (auth/org issue — expected for unauthenticated)");
    } else {
      warn(`Portal returned ${res.status}: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    fail(`Could not reach portal endpoint: ${err.message}`);
  }

  summarize();
}

function summarize() {
  console.log("\n══════════════════════════════════════════");
  if (failures.length === 0) {
    console.log("  ✅ ALL TESTS PASSED — Stripe baseline is healthy");
  } else {
    console.log(`  ❌ ${failures.length} FAILURE(S):`);
    failures.forEach((f, i) => console.log(`     ${i + 1}. ${f}`));
  }
  console.log("══════════════════════════════════════════\n");
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
