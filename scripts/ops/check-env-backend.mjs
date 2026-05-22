#!/usr/bin/env node
import { readFileSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i <= 0) continue;
  const key = line.slice(0, i).trim();
  if (!key || process.env[key]) continue;
  let value = line.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "STRIPE_SECRET_KEY",
];

const missing = required.filter((k) => !String(process.env[k] ?? "").trim());
if (missing.length) {
  console.log("FAIL Missing env keys:", missing.join(", "));
  process.exit(1);
}
console.log("PASS All required env keys present");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (res.status === 200) {
  console.log("PASS Supabase REST reachable (HTTP 200)");
} else {
  console.log(`FAIL Supabase REST HTTP ${res.status}`);
  process.exit(1);
}
