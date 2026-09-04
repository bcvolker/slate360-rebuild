/**
 * Validate artifact_manifest.json, upload approved client files to R2,
 * and upsert existing Slate360 records. Does not reconstruct.
 */
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, resolve, extname } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

let validateManifest;
let isClientServing;
let solvePlanFrame;
try {
  ({ validateManifest, isClientServing } = await import("../../lib/local-artifacts/manifest.ts"));
  ({ solvePlanFrame } = await import("../../lib/local-artifacts/plan-calibration.ts"));
} catch {
  console.error("Run with: npx tsx scripts/ops/publish-local-artifacts.mjs --manifest <file>");
  process.exit(1);
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i <= 0 || line.startsWith("#")) continue;
    const key = line.slice(0, i).trim();
    if (process.env[key]) continue;
    process.env[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(resolve(".env.local"));

const args = process.argv.slice(2);
const manifestPath = args[args.indexOf("--manifest") + 1];
if (!manifestPath || args.indexOf("--manifest") < 0) {
  console.error("usage: node scripts/ops/publish-local-artifacts.mjs --manifest <file>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const { manifest, issues } = validateManifest(raw);
if (!manifest) {
  console.error(issues);
  process.exit(1);
}
const root = dirname(resolve(manifestPath));
for (const item of manifest.artifacts) {
  const abs = resolve(root, item.path);
  if (!existsSync(abs)) {
    console.error("missing file", item.path);
    process.exit(1);
  }
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const bucket = process.env.R2_BUCKET || "slate360-storage";

const { data: project } = await admin.from("projects").select("id, org_id, name").ilike("name", `%${manifest.projectKey}%`).limit(5);
const commercial = (project ?? []).find((p) => /aob205/i.test(p.name) && !/housewalk|fixture/i.test(p.name));
if (!commercial) throw new Error(`no commercial project for ${manifest.projectKey}`);
const orgId = commercial.org_id;
const projectId = commercial.id;

const { data: existingWalk } = await admin
  .from("spatial_walkthroughs")
  .select("id, created_by")
  .eq("project_id", projectId)
  .eq("org_id", orgId)
  .ilike("title", "%August 17%")
  .maybeSingle();
let walkId = existingWalk?.id;
let createdBy = existingWalk?.created_by;
if (!createdBy) {
  const { data: anyWalk } = await admin.from("spatial_walkthroughs").select("created_by").eq("org_id", orgId).not("created_by", "is", null).limit(1).maybeSingle();
  createdBy = anyWalk?.created_by ?? null;
}
if (!walkId) {
  const ins = await admin.from("spatial_walkthroughs").insert({
    org_id: orgId,
    project_id: projectId,
    created_by: createdBy,
    title: manifest.title,
    captured_at: `${manifest.visitDate}T16:50:04.000Z`,
    building: manifest.building ?? manifest.projectKey,
    floor: manifest.floor ?? null,
    walkthrough_type: "interior",
    status: "published",
    operator_patch: { enabled: false },
    default_policy: "client",
  }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  walkId = ins.data.id;
}

async function putR2(key, abs, type) {
  const body = readFileSync(abs);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: type || "application/octet-stream",
    ContentLength: body.byteLength,
  }));
  return { key, bytes: body.byteLength };
}

const prefix = `orgs/${orgId}/local-artifacts/${manifest.projectKey}/${manifest.visitDate}`;
const uploaded = [];
const stations = [];
let planKey = null;
let posterKey = null;
let proxyKey = null;

const includeLineage = args.includes("--include-lineage");
const docKeys = [];
for (const item of manifest.artifacts) {
  if (item.role === "lineage" && !includeLineage) continue;
  if (item.qaStatus === "rejected" && item.role === "client") continue;
  if (item.kind.startsWith("gaussian_") && item.qaStatus !== "accepted" && item.role === "client") continue;
  const abs = resolve(root, item.path);
  const key = `${prefix}/${item.kind}/${item.id}${extname(abs)}`;
  const type = item.contentType || (extname(abs) === ".pdf" ? "application/pdf" : extname(abs) === ".jpg" ? "image/jpeg" : "application/octet-stream");
  if (item.role === "client" && !isClientServing(item)) continue;
  console.error(`upload ${item.kind} ${item.id}`);
  const put = await putR2(key, abs, type);
  uploaded.push({ id: item.id, kind: item.kind, key, role: item.role, bytes: put.bytes });
  if (item.kind === "station_erp" && item.stationId) stations.push({ stationId: item.stationId, key, title: item.stationId, bytes: put.bytes });
  if (item.kind === "plan_pdf") planKey = key;
  if (item.kind === "document") docKeys.push({ key, title: basename(abs) });
  if (item.kind === "walkthrough_poster") posterKey = key;
  if (item.kind === "walkthrough_proxy") proxyKey = key;
}

if (proxyKey) {
  const { data: clip } = await admin.from("spatial_clips").select("id").eq("walkthrough_id", walkId).maybeSingle();
  const row = {
    org_id: orgId,
    walkthrough_id: walkId,
    title: basename(proxyKey),
    master_key: proxyKey,
    proxy_key: proxyKey,
    poster_key: posterKey,
    status: "ready",
    width: 3840,
    height: 1920,
  };
  if (clip) await admin.from("spatial_clips").update(row).eq("id", clip.id);
  else await admin.from("spatial_clips").insert({ ...row, sort_order: 0 });
}

let tourSlug = `aob205-${manifest.visitDate.replace(/-/g, "")}`;
if (stations.length) {
  let { data: tour } = await admin.from("project_tours").select("id, viewer_slug").eq("project_id", projectId).eq("viewer_slug", tourSlug).maybeSingle();
  if (!tour) {
    const ins = await admin.from("project_tours").insert({
      org_id: orgId,
      project_id: projectId,
      created_by: createdBy,
      title: `${manifest.projectKey} 360 documentation`,
      purpose: "construction",
      status: "published",
      viewer_slug: tourSlug,
    }).select("id, viewer_slug").single();
    if (ins.error) throw new Error(ins.error.message);
    tour = ins.data;
  }
  await admin.from("tour_scenes").delete().eq("tour_id", tour.id);
  await admin.from("tour_scenes").insert(stations.map((s, i) => ({
    tour_id: tour.id,
    sort_order: i,
    title: s.title,
    panorama_path: s.key,
    thumbnail_path: s.key,
    file_size_bytes: s.bytes ?? 0,
    scene_kind: "interior_plan",
    status: "ready",
    view_limits: {
      stationId: s.stationId,
      adjacentStationIds: [stations[i - 1]?.stationId, stations[i + 1]?.stationId].filter(Boolean),
    },
  })));
}

let planSetId = null;
if (planKey) {
  const frame = manifest.planControls ? solvePlanFrame(manifest.planControls) : null;
  const { data: existingSet } = await admin.from("site_walk_plan_sets").select("id").eq("project_id", projectId).ilike("title", "%AOB205%").maybeSingle();
  const payload = {
    org_id: orgId,
    project_id: projectId,
    title: "AOB205 floor plan",
    source_s3_key: planKey,
    original_file_name: "AOB205-plan.pdf",
    mime_type: "application/pdf",
    processing_status: "ready",
    uploaded_by: createdBy,
    metadata: { visitDate: manifest.visitDate, planFrame: frame, lineage: "local-artifact-publisher" },
  };
  if (existingSet) {
    await admin.from("site_walk_plan_sets").update(payload).eq("id", existingSet.id);
    planSetId = existingSet.id;
  } else {
    const ins = await admin.from("site_walk_plan_sets").insert(payload).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    planSetId = ins.data.id;
    await admin.from("site_walk_plan_sheets").insert({
      org_id: orgId,
      project_id: projectId,
      plan_set_id: planSetId,
      sheet_number: 1,
      sheet_name: "AOB205",
      image_s3_key: planKey,
      metadata: { source: "pdf" },
    });
  }
  if (planSetId && stations.length) {
    await admin.from("project_tours").update({ plan_set_id: planSetId }).eq("viewer_slug", tourSlug);
  }
}

let shareToken = null;
const { data: shares } = await admin.from("spatial_share_tokens").select("id, is_revoked").eq("walkthrough_id", walkId).eq("is_revoked", false);
if (!shares?.length) {
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const ins = await admin.from("spatial_share_tokens").insert({
    org_id: orgId,
    walkthrough_id: walkId,
    token,
    token_hash: hash,
    token_prefix: token.slice(0, 8),
    policy: "client",
    allow_download: false,
    branding_snapshot: { showPoweredBy: true },
  }).select("id");
  if (ins.error) throw new Error(ins.error.message);
  shareToken = token;
}

let { data: pin } = await admin.from("spatial_pins").select("id").eq("project_id", projectId).eq("label", "AOB205 west wall coordination").maybeSingle();
if (!pin) {
  const ins = await admin.from("spatial_pins").insert({
    org_id: orgId,
    project_id: projectId,
    walkthrough_id: walkId,
    created_by: createdBy,
    label: "AOB205 west wall coordination",
    pin_type: "note",
    body: "Demonstration item. Same record from Plan, 360 Documentation, Walkthrough, and Reality Twin when those locators exist.\n\n— Brian: Confirm west-wall clear width against 918A0025.",
    visibility: "client",
    status: "open",
    xyz: { sheetHint: "918A0025", stationHint: stations[0]?.stationId ?? null },
  }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  pin = ins.data;
}
if (pin && (planKey || docKeys.length)) {
  const { data: existingAtt } = await admin.from("spatial_pin_attachments").select("id").eq("pin_id", pin.id);
  if (!existingAtt?.length) {
    const files = [
      ...(planKey ? [{ key: planKey, title: "918A0025 floor plan" }] : []),
      ...docKeys,
    ];
    for (const file of files) {
      const drop = await admin.from("slatedrop_uploads").insert({
        org_id: orgId,
        project_id: projectId,
        file_name: file.title,
        file_type: "application/pdf",
        s3_key: file.key,
        status: "active",
        uploaded_by: createdBy,
      }).select("id").single();
      if (drop.error) {
        console.warn("slatedrop", file.title, drop.error.message);
        continue;
      }
      const att = await admin.from("spatial_pin_attachments").insert({
        org_id: orgId,
        pin_id: pin.id,
        kind: "slatedrop",
        slatedrop_id: drop.data.id,
        title: file.title,
        visible_on_public: true,
      });
      if (att.error) console.warn("pin attachments", att.error.message);
    }
  }
}

console.log(JSON.stringify({
  projectId,
  walkthroughId: walkId,
  tourSlug: stations.length ? tourSlug : null,
  planSetId,
  uploaded: uploaded.length,
  stations: stations.length,
  shareToken,
  portalHint: shareToken ? `/portal/${shareToken}` : "reuse existing unrevoked share on this walkthrough",
}, null, 2));
