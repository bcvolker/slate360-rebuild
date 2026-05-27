#!/usr/bin/env node

/**
 * Verifies R2 bucket CORS policy includes Digital Twin multipart upload requirements.
 *
 * Usage: node scripts/ops/verify-digital-twin-r2-cors.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { GetBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getEnv(name) {
  return process.env[name]?.trim() ?? "";
}

const REQUIRED_ORIGINS = [
  "https://www.slate360.ai",
  "https://slate360.ai",
  "http://localhost:3000",
];

const REQUIRED_METHODS = ["PUT", "GET", "HEAD"];
const REQUIRED_EXPOSE = ["ETag"];

function corsRuleMatches(rule) {
  const origins = rule.AllowedOrigins ?? [];
  const methods = (rule.AllowedMethods ?? []).map((m) => m.toUpperCase());
  const expose = rule.ExposeHeaders ?? [];

  const originOk = REQUIRED_ORIGINS.every((o) =>
    origins.some((allowed) => allowed === o || allowed === "*"),
  );
  const methodOk = REQUIRED_METHODS.every((m) => methods.includes(m));
  const exposeOk = REQUIRED_EXPOSE.every((h) =>
    expose.some((e) => e.toLowerCase() === h.toLowerCase()),
  );

  return { originOk, methodOk, exposeOk, origins, methods, expose };
}

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const bucket = getEnv("R2_BUCKET") || "slate360-storage";
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const endpoint =
    getEnv("R2_ENDPOINT") ||
    (getEnv("CLOUDFLARE_ACCOUNT_ID")
      ? `https://${getEnv("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
      : "");

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.log("[verify-dt-cors] SKIPPED: missing R2 credentials or endpoint");
    process.exit(0);
  }

  const s3 = new S3Client({
    region: getEnv("R2_REGION") || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const { CORSRules } = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = CORSRules ?? [];

    if (rules.length === 0) {
      console.error("[verify-dt-cors] FAIL: no CORS rules on bucket", bucket);
      process.exit(1);
    }

    console.log(`[verify-dt-cors] Bucket: ${bucket} (${rules.length} rule(s))`);

    let anyPass = false;
    for (let i = 0; i < rules.length; i++) {
      const check = corsRuleMatches(rules[i]);
      console.log(`  Rule ${i + 1}: origins=${check.originOk ? "ok" : "MISSING"} methods=${check.methodOk ? "ok" : "MISSING"} expose=${check.exposeOk ? "ok" : "MISSING"}`);
      if (check.originOk && check.methodOk && check.exposeOk) anyPass = true;
    }

    if (!anyPass) {
      console.error("\n[verify-dt-cors] FAIL: no rule satisfies Digital Twin multipart requirements");
      console.error("Required origins:", REQUIRED_ORIGINS.join(", "));
      console.error("Required methods:", REQUIRED_METHODS.join(", "));
      console.error("Required ExposeHeaders:", REQUIRED_EXPOSE.join(", "));
      process.exit(1);
    }

    console.log("\n[verify-dt-cors] PASS");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NoSuchCORSConfiguration") || msg.includes("cors")) {
      console.error("[verify-dt-cors] FAIL: CORS not configured — apply policy from BACKEND_P0_COMPLETE.md");
    } else {
      console.error("[verify-dt-cors] FAIL:", msg);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[verify-dt-cors] Unexpected:", err);
  process.exit(1);
});
