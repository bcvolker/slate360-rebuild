#!/usr/bin/env node

/**
 * Slice 1 smoke: preview fixtures are public; authenticated vNext routes
 * redirect to login without a session; production homes still exist.
 * Does not edit middleware.
 */

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";

async function get(path, opts = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
    ...opts,
  });
}

function isRedirect(status) {
  return status === 302 || status === 303 || status === 307 || status === 308;
}

async function main() {
  try {
    await fetch(`${baseUrl}/`, { method: "GET", signal: AbortSignal.timeout(3_000) });
  } catch {
    console.log(`[smoke-vnext-slice1] SKIPPED: app not reachable at ${baseUrl}`);
    process.exit(0);
  }

  let failures = 0;

  const previewClient = await get("/preview/vnext/client");
  if (previewClient.status !== 200) {
    failures += 1;
    console.error(`❌ GET /preview/vnext/client expected 200, got ${previewClient.status}`);
  } else {
    console.log("✅ GET /preview/vnext/client 200");
  }

  const previewOwner = await get("/preview/vnext/owner");
  if (previewOwner.status !== 200) {
    failures += 1;
    console.error(`❌ GET /preview/vnext/owner expected 200, got ${previewOwner.status}`);
  } else {
    console.log("✅ GET /preview/vnext/owner 200");
  }

  const vnextProjects = await get("/vnext/projects");
  const loc = vnextProjects.headers.get("location") ?? "";
  if (!isRedirect(vnextProjects.status) || !loc.includes("/login")) {
    failures += 1;
    console.error(
      `❌ GET /vnext/projects expected login redirect, got ${vnextProjects.status} ${loc}`,
    );
  } else {
    console.log(`✅ GET /vnext/projects → login (${vnextProjects.status})`);
  }

  const vnextOps = await get("/vnext/ops");
  const opsLoc = vnextOps.headers.get("location") ?? "";
  if (!isRedirect(vnextOps.status) || !opsLoc.includes("/login")) {
    failures += 1;
    console.error(`❌ GET /vnext/ops expected login redirect, got ${vnextOps.status} ${opsLoc}`);
  } else {
    console.log(`✅ GET /vnext/ops → login (${vnextOps.status})`);
  }

  const dashboard = await get("/dashboard");
  if (dashboard.status === 404) {
    failures += 1;
    console.error("❌ GET /dashboard returned 404 — production route must remain");
  } else {
    console.log(`✅ GET /dashboard still routed (${dashboard.status})`);
  }

  const appHome = await get("/app");
  if (appHome.status === 404) {
    failures += 1;
    console.error("❌ GET /app returned 404 — production route must remain");
  } else {
    console.log(`✅ GET /app still routed (${appHome.status})`);
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
