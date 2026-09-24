#!/usr/bin/env node

/**
 * Slice 1 smoke: preview fixtures are public; authenticated vNext routes
 * redirect to login without a session; production homes still exist.
 * Does not edit middleware.
 */

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";

const AUTH_ROUTES = [
  "/vnext",
  "/vnext/projects",
  "/vnext/account",
  "/vnext/ops",
  "/vnext/ops/clients",
  "/vnext/ops/projects",
  "/vnext/ops/processing",
  "/vnext/ops/qa",
  "/vnext/ops/shares",
  "/vnext/ops/settings",
  "/vnext/ops/account",
];

const LEGACY_LANDINGS = ["/app", "/dashboard", "/site-walk", "/twin", "/thermal-studio", "/slatedrop"];

async function get(path) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
  });
}

function isRedirect(status) {
  return status === 302 || status === 303 || status === 307 || status === 308;
}

function expectedRedirectTo(path) {
  return path === "/vnext" ? "/vnext/projects" : path;
}

function leakedLegacy(loc) {
  const pathname = loc.split("?")[0];
  return LEGACY_LANDINGS.some((legacy) => pathname === legacy || pathname.startsWith(`${legacy}/`));
}

async function followAuthRedirect(path) {
  let current = path;
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await get(current);
    if (!isRedirect(response.status)) {
      return { response, location: current };
    }
    const loc = response.headers.get("location") ?? "";
    if (leakedLegacy(loc)) {
      return { response, location: loc, leaked: true };
    }
    current = new URL(loc, baseUrl).pathname + new URL(loc, baseUrl).search;
    if (current.startsWith("/login")) {
      return { response, location: current };
    }
  }
  return { location: current };
}

async function main() {
  try {
    await fetch(`${baseUrl}/`, { method: "GET", signal: AbortSignal.timeout(3_000) });
  } catch {
    console.log(`[smoke-vnext-slice1] SKIPPED: app not reachable at ${baseUrl}`);
    process.exit(0);
  }

  let failures = 0;

  for (const preview of ["/preview/vnext/client", "/preview/vnext/owner", "/preview/vnext/owner-menu"]) {
    const response = await get(preview);
    if (response.status !== 200) {
      failures += 1;
      console.error(`❌ GET ${preview} expected 200, got ${response.status}`);
    } else {
      console.log(`✅ GET ${preview} 200`);
    }
  }

  for (const path of AUTH_ROUTES) {
    const result = await followAuthRedirect(path);
    const expected = expectedRedirectTo(path);
    const loc = result.location ?? "";
    const params = new URL(loc, baseUrl).searchParams;
    const ok =
      !result.leaked &&
      loc.startsWith("/login") &&
      params.get("redirectTo") === expected;
    if (!ok) {
      failures += 1;
      console.error(`❌ GET ${path} expected login redirectTo=${expected}, got ${loc}`);
    } else {
      console.log(`✅ GET ${path} → login redirectTo=${expected}`);
    }
  }

  for (const path of ["/dashboard", "/app"]) {
    const response = await get(path);
    if (response.status === 404) {
      failures += 1;
      console.error(`❌ GET ${path} returned 404 — production route must remain`);
    } else {
      console.log(`✅ GET ${path} still routed (${response.status})`);
    }
  }

  if (failures > 0) {
    console.error(`\n[smoke-vnext-slice1] FAILED (${failures})`);
    process.exit(1);
  }

  console.log("\n[smoke-vnext-slice1] PASS");
}

main().catch((error) => {
  console.error("[smoke-vnext-slice1] Unexpected error", error);
  process.exit(1);
});
