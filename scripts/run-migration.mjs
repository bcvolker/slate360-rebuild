#!/usr/bin/env node
/**
 * Run a SQL migration against the Supabase project via the Management API.
 * Usage: node scripts/run-migration.mjs <migration-file>
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* ignore */ }

const PROJECT_REF = "hadnfcenpcfaeclczsmm";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("❌ Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), migrationFile), "utf8");
console.log(`📄 Running migration: ${migrationFile}`);
console.log(`📊 SQL length: ${sql.length} chars\n`);

const resp = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await resp.text();

if (!resp.ok) {
  console.error(`❌ HTTP ${resp.status}: ${text}`);
  process.exit(1);
}

let result;
try {
  result = JSON.parse(text);
} catch {
  result = text;
}

console.log("✅ Migration executed successfully");
console.log("Response:", JSON.stringify(result, null, 2).slice(0, 500));
