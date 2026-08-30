#!/usr/bin/env node
/**
 * Mint a passwordless CLIENT share for HouseWalk RC1 screenshots.
 * Writes token to .spatial-rc1-share.json (gitignored). Never prints the token.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const WALKTHROUGH_ID = "7e0575a3-5d55-45d8-807f-9fb959ce2c21";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const token = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(token, "utf8").digest("hex");
const prefix = token.slice(0, 8);
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: wt, error: wtErr } = await admin
  .from("spatial_walkthroughs")
  .select("id, org_id, title, status")
  .eq("id", WALKTHROUGH_ID)
  .maybeSingle();
if (wtErr || !wt) {
  console.error("Walkthrough not found");
  process.exit(1);
}

const { data: existing } = await admin
  .from("spatial_share_tokens")
  .select("created_by")
  .eq("walkthrough_id", WALKTHROUGH_ID)
  .not("created_by", "is", null)
  .limit(1)
  .maybeSingle();

const { data: row, error } = await admin.from("spatial_share_tokens").insert({
  token: null,
  token_hash: hash,
  token_prefix: prefix,
  org_id: wt.org_id,
  walkthrough_id: wt.id,
  created_by: existing?.created_by ?? null,
  policy: "client",
  label: "RC1 demo (passwordless)",
  password_hash: null,
  expires_at: null,
  max_views: null,
  allow_download: false,
  allow_reshare: false,
}).select("id, token_prefix, policy").single();

if (error || !row) {
  console.error(error?.message ?? "insert failed");
  process.exit(1);
}

writeFileSync(
  resolve(process.cwd(), ".spatial-rc1-share.json"),
  JSON.stringify({ tokenPrefix: row.token_prefix, policy: row.policy, shareId: row.id, token }, null, 2),
  { mode: 0o600 },
);
console.log(`wrote .spatial-rc1-share.json prefix=${row.token_prefix} policy=${row.policy}`);
