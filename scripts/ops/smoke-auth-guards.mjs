#!/usr/bin/env node

/**
 * Light smoke checks for auth-guarded APIs.
 * Expects 401 when called without session.
 *
 * Usage:
 *   API_BASE_URL=http://127.0.0.1:3000 node scripts/ops/smoke-auth-guards.mjs
 */

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";

const checks = [
  { path: "/api/projects/summary", method: "GET" },
  { path: "/api/market/trades", method: "GET" },
  { path: "/api/slatedrop/files", method: "GET" },
  { path: "/api/account/api-keys", method: "GET" },
];

async function main() {
  try {
    await fetch(`${baseUrl}/`, { method: "GET", signal: AbortSignal.timeout(3_000) });
  } catch {
    console.log(`[smoke-auth-guards] SKIPPED: app not reachable at ${baseUrl}`);
    process.exit(0);
  }

  let failures = 0;

  for (const check of checks) {
    try {
      const res = await fetch(`${baseUrl}${check.path}`, {
        method: check.method,
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });

      if (res.status !== 401) {
        failures += 1;
        console.error(`❌ ${check.method} ${check.path} expected 401, got ${res.status}`);
      } else {
        console.log(`✅ ${check.method} ${check.path} returned 401`);
      }
    } catch (error) {
      failures += 1;
      console.error(`❌ ${check.method} ${check.path} request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n[smoke-auth-guards] FAILED (${failures} check(s) failed)`);
    process.exit(1);
  }

  console.log("\n[smoke-auth-guards] PASS");
}

main().catch((error) => {
  console.error("[smoke-auth-guards] Unexpected error", error);
  process.exit(1);
});
