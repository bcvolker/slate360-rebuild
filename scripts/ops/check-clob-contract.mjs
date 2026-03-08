#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const routePath = path.join(repoRoot, "app/api/market/buy/route.ts");
const clobApiPath = path.join(repoRoot, "lib/market/clob-api.ts");

function assertContains(source, needle, label, errors) {
  if (!source.includes(needle)) errors.push(`missing ${label}: ${needle}`);
}

function assertNotContains(source, needle, label, errors) {
  if (source.includes(needle)) errors.push(`forbidden ${label}: ${needle}`);
}

async function main() {
  const routeSource = await readFile(routePath, "utf8");
  const clobApiSource = await readFile(clobApiPath, "utf8");
  const errors = [];

  assertContains(routeSource, "CLOB_ORDER_PATH", "versioned CLOB order path", errors);
  assertContains(routeSource, "CLOB_ORDER_TYPE", "versioned order type", errors);
  assertContains(routeSource, "CLOB_FEE_RATE_BPS", "versioned fee rate", errors);

  assertContains(clobApiSource, "timestamp + \"POST\" + CLOB_ORDER_PATH + bodyStr", "signature message path coupling", errors);
  assertContains(clobApiSource, "fetch(`${clob_host}${CLOB_ORDER_PATH}`", "request path coupling", errors);

  assertContains(clobApiSource, "POLY-SIGNATURE", "CLOB signature header", errors);
  assertContains(clobApiSource, "POLY-TIMESTAMP", "CLOB timestamp header", errors);
  assertContains(clobApiSource, "POLY-PASSPHRASE", "CLOB passphrase header", errors);
  assertContains(clobApiSource, "POLY-API-KEY", "CLOB API key header", errors);
  assertContains(clobApiSource, "POLY_ADDRESS", "CLOB address header", errors);
  assertContains(clobApiSource, "size: shares.toFixed(4)", "share-sized live order payload", errors);
  assertContains(routeSource, "outcome, shares, avg_price", "buy route passes shares into CLOB helper", errors);
  assertNotContains(clobApiSource, "size: amount.toFixed(2)", "USDC-sized live order payload", errors);

  assertContains(routeSource, "nonce: makeOrderNonce()", "unique nonce generation", errors);
  assertNotContains(clobApiSource, "nonce: \"0\"", "fixed nonce", errors);

  assertContains(clobApiSource, "let clobData: Record<string, unknown>", "safe response parsing", errors);
  assertContains(clobApiSource, "const clobRaw = await clobRes.text()", "text-first parsing", errors);

  if (errors.length > 0) {
    console.error("[check-clob-contract] FAILED");
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log("[check-clob-contract] PASS");
}

main().catch((err) => {
  console.error("[check-clob-contract] ERROR", err);
  process.exit(1);
});
