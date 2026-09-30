/**
 * Move HouseWalk off the commercial AOB205 project and revoke its public token.
 * Engineering fixtures stay; kitchen media must not answer AOB205 client queries.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i <= 0 || line.startsWith("#")) continue;
    const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (val) out[line.slice(0, i).trim()] = val;
  }
  return out;
}

const env = { ...loadEnv(resolve(".env.local")), ...process.env };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const AOB_PROJECT = "f3f23c68-5510-4f78-ae12-3ea978340f6a";
const ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const HOUSEWALK_WALK = "7e0575a3-5d55-45d8-807f-9fb959ce2c21";
const HOUSEWALK_SHARE = "650011b2-858f-4639-8277-6bba09ad60f3";
const KITCHEN_TWIN = "c06d4425-88e5-4d62-aa79-105ee39004d3";

const { data: walk } = await admin.from("spatial_walkthroughs").select("created_by, org_id").eq("id", HOUSEWALK_WALK).maybeSingle();
const createdBy = walk?.created_by ?? null;

let { data: fixture } = await admin
  .from("projects")
  .select("id, name")
  .eq("org_id", ORG)
  .ilike("name", "HouseWalk (engineering fixture)")
  .maybeSingle();

if (!fixture) {
  const inserted = await admin
    .from("projects")
    .insert({
      org_id: ORG,
      name: "HouseWalk (engineering fixture)",
      location: "Engineering fixture — not a client project",
      project_type: "field",
      created_by: createdBy,
    })
    .select("id, name")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  fixture = inserted.data;
}

const { error: walkErr } = await admin
  .from("spatial_walkthroughs")
  .update({
    project_id: fixture.id,
    title: "HouseWalk X4 live smoke",
    building: "HouseWalk",
    default_policy: "client",
  })
  .eq("id", HOUSEWALK_WALK)
  .eq("project_id", AOB_PROJECT);
if (walkErr) throw new Error(walkErr.message);

const { error: twinErr } = await admin
  .from("digital_twin_spaces")
  .update({ project_id: fixture.id, title: "House — kitchen + dining (360 walk)" })
  .eq("id", KITCHEN_TWIN);
if (twinErr) console.warn("kitchen twin move", twinErr.message);

const { error: pinErr } = await admin.from("spatial_pins").update({ project_id: fixture.id }).eq("walkthrough_id", HOUSEWALK_WALK);
if (pinErr) console.warn("pin move", pinErr.message);

const { data: kitchenPins } = await admin.from("spatial_pins").select("id, label").eq("project_id", AOB_PROJECT);
for (const pin of kitchenPins ?? []) {
  if (!/housewalk|kitchen|landing rail|ceiling stain|residential/i.test(pin.label ?? "")) continue;
  const moved = await admin.from("spatial_pins").update({ project_id: fixture.id }).eq("id", pin.id);
  if (moved.error) console.warn("kitchen pin move", pin.id, moved.error.message);
}

const { error: revErr } = await admin
  .from("spatial_share_tokens")
  .update({ is_revoked: true, expires_at: new Date().toISOString() })
  .eq("id", HOUSEWALK_SHARE);
if (revErr) throw new Error(revErr.message);

const { data: leftover } = await admin
  .from("spatial_walkthroughs")
  .select("id, title")
  .eq("project_id", AOB_PROJECT);
const { data: leftoverPins } = await admin.from("spatial_pins").select("id, label").eq("project_id", AOB_PROJECT);

console.log(JSON.stringify({
  fixtureProjectId: fixture.id,
  housewalkWalkthroughId: HOUSEWALK_WALK,
  commercialTokenRevoked: HOUSEWALK_SHARE,
  aob205WalkthroughsRemaining: leftover ?? [],
  aob205PinsRemaining: leftoverPins ?? [],
}, null, 2));
