#!/usr/bin/env node
/**
 * HTTP smoke test for mobile-critical routes.
 * Does not start a server — point at local dev or a Vercel preview URL.
 *
 * Usage:
 *   npm run smoke:mobile-routes
 *   SMOKE_BASE_URL=https://your-preview.vercel.app npm run smoke:mobile-routes
 *   node scripts/ops/smoke-mobile-routes.mjs https://your-preview.vercel.app
 */

const baseUrl = (
  process.argv[2] ??
  process.env.SMOKE_BASE_URL ??
  process.env.PREVIEW_BASE_URL ??
  "http://127.0.0.1:3000"
).replace(/\/$/, "");

const ROUTES = ["/app", "/site-walk", "/dashboard"];

function classify(status, location) {
  if (status === 200) return "200 OK";
  if (status === 404) return "404 Not Found (route/deployment problem)";
  if (status >= 500) return `${status} Server Error (runtime/server problem)`;
  if (status === 307 || status === 308) {
    if (location && location.includes("/login")) {
      return `${status} Redirect to login (expected when unauthenticated)`;
    }
    return `${status} Redirect → ${location ?? "(no Location header)"}`;
  }
  if (status === 302 || status === 301) {
    return `${status} Redirect → ${location ?? "(no Location header)"}`;
  }
  return `${status} (unexpected — investigate)`;
}

async function probe(path) {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
    const location = res.headers.get("location");
    const label = classify(res.status, location);
    const ok =
      res.status === 200 ||
      (res.status === 307 && location?.includes("/login"));
    return { path, url, status: res.status, location, label, ok };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path,
      url,
      status: null,
      location: null,
      label: `request failed: ${message}`,
      ok: false,
    };
  }
}

async function main() {
  console.log(`\n[smoke:mobile-routes] Base URL: ${baseUrl}\n`);

  let reachable = false;
  try {
    await fetch(`${baseUrl}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    reachable = true;
  } catch {
    console.log(
      "[smoke:mobile-routes] SKIPPED: server not reachable. Start `npm run dev` or set SMOKE_BASE_URL.\n"
    );
    process.exit(0);
  }

  if (!reachable) {
    process.exit(0);
  }

  let failures = 0;
  for (const path of ROUTES) {
    const result = await probe(path);
    const icon = result.ok ? "✅" : "❌";
    console.log(`${icon} ${path}`);
    console.log(`    ${result.label}`);
    if (result.location) console.log(`    Location: ${result.location}`);
    if (!result.ok) failures += 1;
  }

  console.log("");
  if (failures > 0) {
    console.error(`[smoke:mobile-routes] FAILED (${failures} route(s))`);
    process.exit(1);
  }
  console.log("[smoke:mobile-routes] PASS");
}

main().catch((error) => {
  console.error("[smoke:mobile-routes] Unexpected error", error);
  process.exit(1);
});
