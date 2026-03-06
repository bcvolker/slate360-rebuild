#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const routePath = path.join(repoRoot, "app/api/market/buy/route.ts");

function assertContains(source, needle, label, errors) {
  if (!source.includes(needle)) errors.push(`missing ${label}: ${needle}`);
}

function assertNotContains(source, needle, label, errors) {
  if (source.includes(needle)) errors.push(`forbidden ${label}: ${needle}`);
}

async function main() {
  const source = await readFile(routePath, "utf8");
  const errors = [];

  assertContains(source, "CLOB_ORDER_PATH", "versioned CLOB order path", errors);
  assertContains(source, "CLOB_ORDER_TYPE", "versioned order type", errors);
  assertContains(source, "CLOB_FEE_RATE_BPS", "versioned fee rate", errors);

  assertContains(source, "timestamp + \"POST\" + CLOB_ORDER_PATH + bodyStr", "signature message path coupling", errors);
  assertContains(source, "fetch(`${clob_host}${CLOB_ORDER_PATH}`", "request path coupling", errors);

  assertContains(source, "POLY-SIGNATURE", "CLOB signature header", errors);
  assertContains(source, "POLY-TIMESTAMP", "CLOB timestamp header", errors);
  assertContains(source, "POLY-PASSPHRASE", "CLOB passphrase header", errors);
  assertContains(source, "POLY-API-KEY", "CLOB API key header", errors);
  assertContains(source, "POLY_ADDRESS", "CLOB address header", errors);

  assertContains(source, "nonce = makeOrderNonce()", "unique nonce generation", errors);
  assertNotContains(source, "nonce: \"0\"", "fixed nonce", errors);

  assertContains(source, "let clobData: Record<string, unknown>", "safe response parsing", errors);
  assertContains(source, "clobRaw = await clobRes.text()", "text-first parsing", errors);

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
