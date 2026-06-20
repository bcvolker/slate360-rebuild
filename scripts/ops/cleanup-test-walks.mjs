#!/usr/bin/env node
/**
 * cleanup-test-walks.mjs — bulk-clear test Site Walk sessions ("walks").
 *
 * Why: months of ad-hoc "Quick Scan" walks and walks on plan-less test
 * projects pile up and there is no fast way to clear them from the phone.
 * This keeps any walk whose PROJECT has a plan set uploaded
 * (site_walk_plan_sets) so the walks-with-plans flow stays testable, and
 * deletes everything else.
 *
 * SAFE BY DEFAULT: dry-run. It prints exactly what it WOULD keep vs delete
 * and changes nothing until you pass --execute.
 *
 * Usage:
 *   node scripts/ops/cleanup-test-walks.mjs                 # dry-run, all orgs
 *   node scripts/ops/cleanup-test-walks.mjs --org=<orgId>   # scope to one org
 *   node scripts/ops/cleanup-test-walks.mjs --execute       # actually delete walks
 *   node scripts/ops/cleanup-test-walks.mjs --execute --include-projects
 *                                                           # ALSO delete plan-less projects (DB rows; S3 left to in-app delete)
 *   node scripts/ops/cleanup-test-walks.mjs --execute --yes # skip the 5s safety pause
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from .env.local.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ── env ──────────────────────────────────────────────────────────────────────
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "\n  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run this where .env.local exists (your machine), not the sandbox.\n",
  );
  process.exit(1);
}

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const INCLUDE_PROJECTS = args.includes("--include-projects");
const SKIP_PAUSE = args.includes("--yes");
const orgArg = args.find((a) => a.startsWith("--org="));
const ORG_ID = orgArg ? orgArg.split("=")[1] : null;

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// child tables to clear (by session_id) before deleting a session row.
// Unknown columns/tables are tolerated so this survives schema drift.
const SESSION_CHILD_TABLES = [
  "site_walk_items",
  "site_walk_pins",
  "site_walk_plans", // legacy per-session plans
  "site_walk_comments",
  "site_walk_deliverables",
];

// child tables to clear (by project_id) before deleting a project row.
const PROJECT_CHILD_TABLES = [
  "project_folders",
  "unified_files",
  "file_folders",
  "project_members",
];

function scoped(query) {
  return ORG_ID ? query.eq("org_id", ORG_ID) : query;
}

async function fetchAll(table, columns) {
  const { data, error } = await scoped(db.from(table).select(columns)).limit(5000);
  if (error) throw new Error(`select ${table}: ${error.message}`);
  return data ?? [];
}

async function deleteIn(table, column, ids) {
  if (ids.length === 0) return { count: 0 };
  let removed = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { error, count } = await db
      .from(table)
      .delete({ count: "exact" })
      .in(column, batch);
    if (error) {
      // tolerate "column does not exist" / "relation does not exist"
      console.warn(`    · skip ${table}.${column}: ${error.message}`);
      return { count: 0 };
    }
    removed += count ?? 0;
  }
  return { count: removed };
}

async function main() {
  console.log("\n  Slate360 — test walk cleanup");
  console.log(`  mode: ${EXECUTE ? "EXECUTE (will delete)" : "DRY RUN (no changes)"}`);
  console.log(`  org:  ${ORG_ID ?? "ALL orgs"}`);
  console.log(`  projects: ${INCLUDE_PROJECTS ? "plan-less projects WILL be deleted" : "kept (walks only)"}\n`);

  // 1. Projects that have a plan set → protected.
  const planSets = await fetchAll("site_walk_plan_sets", "project_id, processing_status");
  const planProjectIds = new Set(
    planSets
      .filter((p) => p.processing_status !== "archived" && p.project_id)
      .map((p) => p.project_id),
  );

  // 2. All projects (for names + the include-projects pass).
  const projects = await fetchAll("projects", "id, name, project_type, created_at");
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // 3. All walks.
  const sessions = await fetchAll(
    "site_walk_sessions",
    "id, title, status, project_id, is_ad_hoc, created_at",
  );

  const keep = [];
  const del = [];
  for (const s of sessions) {
    if (s.project_id && planProjectIds.has(s.project_id)) keep.push(s);
    else del.push(s);
  }

  // ── report ──────────────────────────────────────────────────────────────
  console.log(`  PLAN-BEARING PROJECTS (kept): ${planProjectIds.size}`);
  for (const pid of planProjectIds) {
    console.log(`    ✓ ${projectName.get(pid) ?? "(unknown)"}  [${pid}]`);
  }

  console.log(`\n  WALKS TO KEEP (project has a plan): ${keep.length}`);
  for (const s of keep) {
    console.log(`    ✓ "${s.title}"  → ${projectName.get(s.project_id) ?? "?"}  [${s.id}]`);
  }

  console.log(`\n  WALKS TO DELETE: ${del.length}`);
  for (const s of del) {
    const why = s.project_id ? `project "${projectName.get(s.project_id) ?? "?"}" has no plan` : "ad-hoc / quick walk";
    console.log(`    ✗ "${s.title}"  (${why})  [${s.id}]`);
  }

  let projectsToDelete = [];
  if (INCLUDE_PROJECTS) {
    projectsToDelete = projects.filter((p) => !planProjectIds.has(p.id));
    console.log(`\n  PROJECTS TO DELETE (no plan): ${projectsToDelete.length}`);
    for (const p of projectsToDelete) console.log(`    ✗ "${p.name}"  [${p.id}]`);
  }

  if (!EXECUTE) {
    console.log("\n  Dry run only. Re-run with --execute to apply.\n");
    return;
  }

  if (del.length === 0 && projectsToDelete.length === 0) {
    console.log("\n  Nothing to delete.\n");
    return;
  }

  if (!SKIP_PAUSE) {
    console.log("\n  Executing in 5s — Ctrl-C to abort…");
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── delete walks (children first) ─────────────────────────────────────────
  const delIds = del.map((s) => s.id);
  console.log("\n  Deleting walk children…");
  for (const table of SESSION_CHILD_TABLES) {
    const { count } = await deleteIn(table, "session_id", delIds);
    if (count) console.log(`    · ${table}: ${count}`);
  }
  const { count: walksRemoved } = await deleteIn("site_walk_sessions", "id", delIds);
  console.log(`  Deleted ${walksRemoved} walks.`);

  // ── delete plan-less projects (opt-in) ────────────────────────────────────
  if (INCLUDE_PROJECTS && projectsToDelete.length > 0) {
    const projIds = projectsToDelete.map((p) => p.id);
    console.log("\n  Deleting project children… (S3 files are NOT removed here — use the in-app delete for those)");
    for (const table of PROJECT_CHILD_TABLES) {
      const { count } = await deleteIn(table, "project_id", projIds);
      if (count) console.log(`    · ${table}: ${count}`);
    }
    const { count: projRemoved } = await deleteIn("projects", "id", projIds);
    console.log(`  Deleted ${projRemoved} projects.`);
  }

  console.log("\n  Done.\n");
}

main().catch((err) => {
  console.error("\n  Cleanup failed:", err.message, "\n");
  process.exit(1);
});
