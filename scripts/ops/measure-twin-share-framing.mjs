#!/usr/bin/env node
/**
 * Assert twin share route framing keeps the model visible on load.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-twin-share-framing.mjs [modelIdPrefix]
 *
 * Env:
 *   MEASURE_BASE_URL — default http://127.0.0.1:3000
 *   TWIN_SHARE_TOKEN — optional explicit token (skips DB lookup)
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const VIEWPORTS = [
  { label: "mobile-portrait", width: 390, height: 844 },
  { label: "mobile-landscape", width: 844, height: 390 },
  { label: "desktop", width: 1440, height: 900 },
];

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function resolveShareToken(modelPrefix) {
  const explicit = process.env.TWIN_SHARE_TOKEN?.trim();
  if (explicit) return explicit;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase credentials — set TWIN_SHARE_TOKEN or .env.local");
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let model = null;
  if (modelPrefix.length >= 32) {
    const res = await admin
      .from("digital_twin_models")
      .select("id, space_id")
      .eq("id", modelPrefix)
      .maybeSingle();
    model = res.data;
  } else {
    const byId = await admin
      .from("digital_twin_models")
      .select("id, space_id")
      .ilike("id", `${modelPrefix}%`)
      .limit(1)
      .maybeSingle();
    model = byId.data;
    if (!model) {
      const byKey = await admin
        .from("digital_twin_models")
        .select("id, space_id")
        .ilike("storage_key", `%${modelPrefix}%`)
        .limit(1)
        .maybeSingle();
      model = byKey.data;
    }
  }

  if (!model?.space_id) throw new Error(`Model not found for prefix ${modelPrefix}`);

  const { data: existing } = await admin
    .from("digital_twin_share_tokens")
    .select("token")
    .eq("space_id", model.space_id)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) return existing.token;

  const token = `frame_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("org_id")
    .eq("id", model.space_id)
    .maybeSingle();
  if (!space?.org_id) throw new Error("Space org missing");

  const ceoEmail = process.env.E2E_TWIN_CEO_EMAIL?.trim() || process.env.CEO_EMAIL?.trim() || "slate360ceo@gmail.com";
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", ceoEmail)
    .maybeSingle();
  if (!profile?.id) throw new Error("CEO profile not found for share token insert");

  const { error } = await admin.from("digital_twin_share_tokens").insert({
    token,
    space_id: model.space_id,
    org_id: space.org_id,
    role: "view",
    created_by: profile.id,
    label: "Framing measure",
    is_revoked: false,
  });
  if (error) throw new Error(`Could not create share token: ${error.message}`);
  return token;
}

async function waitForFraming(page) {
  await page.waitForFunction(
    () => {
      const report = window.__TWIN_SPLAT_FRAMING__;
      return Boolean(report?.screenRect);
    },
    undefined,
    { timeout: 120_000 },
  );
  return page.evaluate(() => window.__TWIN_SPLAT_FRAMING__);
}

async function main() {
  loadDotEnvFile(path.resolve(".env"));
  loadDotEnvFile(path.resolve(".env.local"));

  const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const modelPrefix = process.argv[2] ?? "e6e638a0";
  const token = await resolveShareToken(modelPrefix);
  const shareUrl = `${baseUrl}/share/twin/${token}`;

  const headless = process.env.HEADED !== "1";
  const browser = await chromium.launch({
    headless,
    args: [
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });

  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(shareUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
      const report = await waitForFraming(page);
      results.push({ viewport: viewport.label, shareUrl, ...report });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failures = results.filter((row) => !row.fullyVisible);
  console.log(
    JSON.stringify(
      {
        modelPrefix,
        token,
        shareUrl,
        productionUrl: `https://www.slate360.ai/share/twin/${token}?v=74ef6cb4`,
        results,
      },
      null,
      2,
    ),
  );

  if (failures.length) {
    console.error(
      `[measure-twin-share-framing] failures: ${failures.map((row) => row.viewport).join(", ")}`,
    );
    process.exit(1);
  }

  console.log("[measure-twin-share-framing] PASS — model visible on load at all viewports");
}

main().catch((err) => {
  console.error(`[measure-twin-share-framing] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
