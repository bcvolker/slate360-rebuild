#!/usr/bin/env node
/**
 * Phase 1B — Create standalone app Stripe products + prices.
 *
 * Usage:
 *   node scripts/seed-stripe-apps.mjs
 *
 * Requires STRIPE_SECRET_KEY in .env.local or environment.
 *
 * Idempotent: checks for existing products by metadata.app_id before creating.
 * Outputs env var lines to paste into .env.local and Vercel.
 */

import Stripe from "stripe";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf8");
  const parsed = {};
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      parsed[key] = val;
    }
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  // fall through — env may be set externally
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("❌ Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

/** App definitions — extend this array for future standalone apps */
const APPS = [
  {
    appId: "tour_builder",
    name: "Slate360 Tour Builder",
    description: "Standalone 360° virtual tour creation and hosting",
    monthlyPriceUsd: 4900, // cents
    envVarMonthly: "STRIPE_PRICE_APP_TOUR_BUILDER_MONTHLY",
  },
  {
    appId: "punchwalk",
    name: "Slate360 PunchWalk",
    description: "Standalone punch list and field walkthrough app (placeholder)",
    monthlyPriceUsd: 4900, // cents
    envVarMonthly: "STRIPE_PRICE_APP_PUNCHWALK_MONTHLY",
  },
];

async function findOrCreateProduct(app) {
  // Search for existing product by metadata
  const existing = await stripe.products.search({
    query: `metadata["app_id"]:"${app.appId}"`,
  });

  if (existing.data.length > 0) {
    console.log(`✅ Product "${app.name}" already exists: ${existing.data[0].id}`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name: app.name,
    description: app.description,
    metadata: { app_id: app.appId, kind: "standalone_app" },
  });
  console.log(`✅ Created product "${app.name}": ${product.id}`);
  return product;
}

async function findOrCreatePrice(product, app) {
  // Check for existing monthly price on this product
  const prices = await stripe.prices.list({
    product: product.id,
    type: "recurring",
    active: true,
    limit: 10,
  });

  const existingMonthly = prices.data.find(
    (p) => p.recurring?.interval === "month" && p.unit_amount === app.monthlyPriceUsd
  );

  if (existingMonthly) {
    console.log(`✅ Monthly price for "${app.name}" already exists: ${existingMonthly.id}`);
    return existingMonthly;
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: app.monthlyPriceUsd,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { app_id: app.appId, kind: "standalone_app" },
  });
  console.log(`✅ Created monthly price for "${app.name}": ${price.id} ($${app.monthlyPriceUsd / 100}/mo)`);
  return price;
}

async function main() {
  console.log("\n🚀 Phase 1B — Seeding Stripe standalone app products\n");
  console.log(`Using Stripe key: ${secretKey.slice(0, 12)}...${secretKey.slice(-4)}\n`);

  const envLines = [];

  for (const app of APPS) {
    const product = await findOrCreateProduct(app);
    const price = await findOrCreatePrice(product, app);
    envLines.push(`${app.envVarMonthly}=${price.id}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Add these to .env.local and Vercel environment variables:");
  console.log("=".repeat(60) + "\n");
  for (const line of envLines) {
    console.log(line);
  }
  console.log("\n✅ Phase 1B complete\n");
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
