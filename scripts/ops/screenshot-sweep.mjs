#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * Slate360 Route Screenshot Sweep
 *
 * Captures screenshots of all public/simple-auth routes for
 * visual design-system rollout verification.
 *
 * Usage:
 *   node scripts/ops/screenshot-sweep.mjs
 *   node scripts/ops/screenshot-sweep.mjs --base-url=http://localhost:3000
 *
 * Output: screenshots saved to .brand-audit/ directory (gitignored).
 *
 * Note: Auth-gated routes will show login redirects unless
 * you provide a session cookie via SWEEP_COOKIE env var.
 * ═══════════════════════════════════════════════════════════════
 */
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = process.argv.find(a => a.startsWith("--base-url="))?.split("=")[1] ?? "http://localhost:3000";
const OUT_DIR = path.join(ROOT, ".brand-audit");

/** Routes to screenshot (public or semi-public only — no dynamic tokens) */
const ROUTES = [
  { id: "homepage", path: "/" },
  { id: "login", path: "/login" },
  { id: "signup", path: "/signup" },
  { id: "forgot-password", path: "/forgot-password" },
  { id: "reset-password", path: "/reset-password" },
  { id: "beta-pending", path: "/beta-pending" },
  { id: "install", path: "/install" },
  { id: "terms", path: "/terms" },
  { id: "privacy", path: "/privacy" },
  { id: "not-found", path: "/this-page-does-not-exist-404" },
  { id: "deploy-check", path: "/deploy-check" },
  // Auth-gated routes (will screenshot login redirect if no cookie)
  { id: "dashboard", path: "/dashboard" },
  { id: "projects", path: "/projects" },
  { id: "project-hub", path: "/project-hub" },
  { id: "my-account", path: "/my-account" },
  { id: "settings", path: "/settings" },
  { id: "plans", path: "/plans" },
  { id: "tours", path: "/tours" },
  { id: "analytics", path: "/analytics" },
  { id: "slatedrop", path: "/slatedrop" },
];

async function main() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    console.error("[screenshot-sweep] Playwright not installed. Run: npx playwright install chromium");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Optional: inject auth cookie for gated routes
  const cookie = process.env.SWEEP_COOKIE;
  if (cookie) {
    const url = new URL(BASE_URL);
    await context.addCookies([{
      name: "sb-hadnfcenpcfaeclczsmm-auth-token",
      value: cookie,
      domain: url.hostname,
      path: "/",
    }]);
  }

  console.log(`[screenshot-sweep] Capturing ${ROUTES.length} routes from ${BASE_URL}\n`);

  const results = [];
  for (const route of ROUTES) {
    const page = await context.newPage();
    const url = `${BASE_URL}${route.path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      const filename = `${route.id}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
      results.push({ id: route.id, status: "ok", file: filename });
      console.log(`  ✅ ${route.id} → ${filename}`);
    } catch (err) {
      results.push({ id: route.id, status: "error", error: err.message });
      console.log(`  ❌ ${route.id} → ${err.message}`);
    }
    await page.close();
  }

  await browser.close();

  // Write results manifest
  const manifest = { timestamp: new Date().toISOString(), baseUrl: BASE_URL, results };
  await import("node:fs").then(fs =>
    fs.writeFileSync(path.join(OUT_DIR, "sweep-manifest.json"), JSON.stringify(manifest, null, 2))
  );

  const ok = results.filter(r => r.status === "ok").length;
  console.log(`\n[screenshot-sweep] Done: ${ok}/${results.length} captured → ${OUT_DIR}/`);
}

main().catch(err => {
  console.error("[screenshot-sweep] Fatal:", err.message);
  process.exit(2);
});
