#!/usr/bin/env node
/**
 * Upload a Postshot .spz into Twin Studio and mint /share/twin/[token] (Phase L0).
 *
 *   node scripts/local-splat/ingest-splat.mjs --file room.spz --title "Kitchen 2026-09-06"
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1]?.trim() || fallback) : fallback;
}

function env(name) {
  return process.env[name]?.trim() ?? "";
}

loadEnv(path.resolve(".env"));
loadEnv(path.resolve(".env.local"));

const filePath = arg("file");
const title = arg("title", path.basename(filePath || "local-splat", path.extname(filePath || "")));
const projectQuery = arg("project");
if (!filePath || !fs.existsSync(filePath)) {
  console.error('usage: node scripts/local-splat/ingest-splat.mjs --file <file.spz> [--title "..."] [--project name]');
  process.exit(1);
}
if (path.extname(filePath).toLowerCase() !== ".spz") {
  console.error("Viewer only loads .spz. Re-export SPZ from Postshot (ply is unsupported).");
  process.exit(1);
}

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
const ceoEmail = env("CEO_EMAIL") || env("PRIMARY_CEO_EMAIL");
const bucket = env("R2_BUCKET") || "slate360-storage";
const accessKeyId = env("R2_ACCESS_KEY_ID");
const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
const endpoint =
  env("R2_ENDPOINT") ||
  (env("CLOUDFLARE_ACCOUNT_ID")
    ? `https://${env("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
    : "");
const siteUrl = (env("NEXT_PUBLIC_SITE_URL") || env("NEXT_PUBLIC_BASE_URL") || "https://www.slate360.ai").replace(
  /\/$/,
  "",
);

if (!supabaseUrl || !serviceRole || !ceoEmail) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CEO_EMAIL");
  process.exit(1);
}
if (!accessKeyId || !secretAccessKey || !endpoint) {
  console.error("Missing R2 credentials");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const s3 = new S3Client({
  region: env("R2_REGION") || "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id, email")
  .ilike("email", ceoEmail)
  .maybeSingle();
if (profileError || !profile?.id) {
  console.error("CEO profile not found:", profileError?.message ?? ceoEmail);
  process.exit(1);
}

const { data: member, error: memberError } = await admin
  .from("organization_members")
  .select("org_id, user_id")
  .eq("user_id", profile.id)
  .limit(1)
  .maybeSingle();
if (memberError || !member?.org_id) {
  console.error("CEO org membership not found:", memberError?.message);
  process.exit(1);
}

let projectQueryBuilder = admin
  .from("projects")
  .select("id, name")
  .eq("org_id", member.org_id)
  .eq("status", "active")
  .order("created_at", { ascending: false })
  .limit(8);
if (projectQuery) projectQueryBuilder = projectQueryBuilder.ilike("name", `%${projectQuery}%`);
const { data: projects, error: projectError } = await projectQueryBuilder;
if (projectError || !projects?.length) {
  console.error("No active project:", projectError?.message ?? projectQuery);
  process.exit(1);
}
const project = projects[0];

const { data: space, error: spaceError } = await admin
  .from("digital_twin_spaces")
  .insert({
    org_id: member.org_id,
    project_id: project.id,
    created_by: profile.id,
    title,
    status: "processing",
  })
  .select("id")
  .single();
if (spaceError || !space?.id) {
  console.error("Space create failed:", spaceError?.message);
  process.exit(1);
}

const body = fs.readFileSync(filePath);
const { data: model, error: modelError } = await admin
  .from("digital_twin_models")
  .insert({
    org_id: member.org_id,
    space_id: space.id,
    title,
    model_format: "spz",
    storage_key: "pending",
    file_size_bytes: body.length,
    is_primary: true,
    status: "processing",
  })
  .select("id")
  .single();
if (modelError || !model?.id) {
  console.error("Model create failed:", modelError?.message);
  process.exit(1);
}

const storageKey = `orgs/${member.org_id}/digital-twin/${space.id}/models/${model.id}.spz`;
await s3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: body,
    ContentType: "application/octet-stream",
  }),
);

const { error: readyError } = await admin
  .from("digital_twin_models")
  .update({ storage_key: storageKey, status: "ready" })
  .eq("id", model.id);
if (readyError) {
  console.error("Model ready update failed:", readyError.message);
  process.exit(1);
}
await admin
  .from("digital_twin_spaces")
  .update({ status: "ready", published_model_id: model.id })
  .eq("id", space.id);

const token = randomBytes(24).toString("base64url");
const { error: shareError } = await admin.from("digital_twin_share_tokens").insert({
  token,
  org_id: member.org_id,
  space_id: space.id,
  created_by: profile.id,
  role: "view",
  label: title,
});
if (shareError) {
  console.error("Share token insert failed:", shareError.message);
  process.exit(1);
}

const studioUrl = `${siteUrl}/digital-twin/twins/${space.id}`;
const shareUrl = `${siteUrl}/share/twin/${token}`;
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(
  path.resolve("tmp/local-splat-last-share.json"),
  JSON.stringify(
    {
      spaceId: space.id,
      modelId: model.id,
      projectId: project.id,
      storageKey,
      shareUrl,
      studioUrl,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);

console.log("[local-splat] project", project.name);
console.log("[local-splat] space  ", space.id);
console.log("[local-splat] model  ", model.id);
console.log("[local-splat] r2     ", storageKey);
console.log("[local-splat] studio ", studioUrl);
console.log("[local-splat] share  ", shareUrl);
console.log("[local-splat] gate: open the share on your phone. Recapture if you would not send it to a GC.");
