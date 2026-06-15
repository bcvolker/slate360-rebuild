// ---------------------------------------------------------------------------
// Stripe catalog sync — single source of truth = the homepage pricing
// (lib/marketing/pricing-config.ts). Creates/updates Products + Prices in
// Stripe (idempotent via price lookup_key) and prints the env vars to paste
// into Vercel (and writes them to .env.local automatically).
//
// Usage:  node scripts/ops/stripe-sync-catalog.mjs
// Reads STRIPE_SECRET_KEY from .env.local. Safe to re-run — existing prices
// (matched by lookup_key) are reused, never duplicated.
// ---------------------------------------------------------------------------

import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = join(root, ".env.local");

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const env = loadEnv(envPath);
const secret = process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("Missing STRIPE_SECRET_KEY (.env.local or environment).");
  process.exit(1);
}
const stripe = new Stripe(secret);
console.log(`Stripe mode: ${secret.startsWith("sk_test") ? "TEST/sandbox" : "LIVE"}`);

// Canonical catalog — MUST match lib/marketing/pricing-config.ts (the homepage).
// monthly/annual are in whole USD dollars. annual === full yearly charge.
const SUBSCRIPTIONS = [
  { key: "sitewalk_basic",   product: "Site Walk Basic",        envBase: "STRIPE_PRICE_SITEWALK_BASIC",   monthly: 79,  annual: 787 },
  { key: "sitewalk_pro",     product: "Site Walk Pro",          envBase: "STRIPE_PRICE_SITEWALK_PRO",     monthly: 149, annual: 1484 },
  { key: "digitaltwin_basic",product: "Twin 360 Essential",     envBase: "STRIPE_PRICE_DIGITALTWIN_BASIC",monthly: 99,  annual: 986 },
  { key: "digitaltwin_pro",  product: "Twin 360 Professional",  envBase: "STRIPE_PRICE_DIGITALTWIN_PRO",  monthly: 249, annual: 2480 },
  { key: "bundle_field_pro", product: "Site Walk + Twin 360 Bundle", envBase: "STRIPE_PRICE_BUNDLE_FIELD_PRO", monthly: 349, annual: 3476 },
];

// One-time credit packs (no markup — at cost).
const CREDIT_PACKS = [
  { key: "credits_500",  product: "500 Processing Credits",   envBase: "STRIPE_PRICE_CREDITS_500",  usd: 19 },
  { key: "credits_2000", product: "2,000 Processing Credits", envBase: "STRIPE_PRICE_CREDITS_2000", usd: 49 },
  { key: "credits_5000", product: "5,000 Processing Credits", envBase: "STRIPE_PRICE_CREDITS_5000", usd: 99 },
];

async function findOrCreateProduct(key, name) {
  const found = await stripe.products.search({ query: `metadata['s360_plan']:'${key}' AND active:'true'` });
  if (found.data[0]) return found.data[0];
  return stripe.products.create({ name, metadata: { s360_plan: key } });
}

async function findOrCreatePrice({ product, lookupKey, usd, interval }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: usd * 100,
    lookup_key: lookupKey,
    ...(interval ? { recurring: { interval } } : {}),
  });
}

const results = {};

for (const plan of SUBSCRIPTIONS) {
  const product = await findOrCreateProduct(plan.key, plan.product);
  const monthly = await findOrCreatePrice({ product, lookupKey: `${plan.key}_monthly`, usd: plan.monthly, interval: "month" });
  const annual = await findOrCreatePrice({ product, lookupKey: `${plan.key}_annual`, usd: plan.annual, interval: "year" });
  results[plan.envBase] = monthly.id;
  results[`${plan.envBase}_ANNUAL`] = annual.id;
  console.log(`✓ ${plan.product}: monthly=${monthly.id} annual=${annual.id}`);
}

for (const pack of CREDIT_PACKS) {
  const product = await findOrCreateProduct(pack.key, pack.product);
  const price = await findOrCreatePrice({ product, lookupKey: pack.key, usd: pack.usd });
  results[pack.envBase] = price.id;
  console.log(`✓ ${pack.product}: ${price.id}`);
}

// Write results back into .env.local (replace existing lines or append).
let envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
for (const [k, v] of Object.entries(results)) {
  const line = `${k}="${v}"`;
  const re = new RegExp(`^${k}=.*$`, "m");
  envText = re.test(envText) ? envText.replace(re, line) : envText.replace(/\s*$/, `\n${line}\n`);
}
writeFileSync(envPath, envText);

console.log("\n--- Paste these into Vercel (Project → Settings → Environment Variables) ---");
for (const [k, v] of Object.entries(results)) console.log(`${k}=${v}`);
console.log("\n.env.local updated.");
