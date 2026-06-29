/**
 * POST /api/slatedrop/backfill-app-folders
 *
 * Reconcile SlateDrop folders against the org's CURRENT app subscriptions across
 * ALL of its existing projects. Idempotent (existence-guarded) and additive-only:
 * it provisions the per-app branches (Site Walk, Twin 360, …) the org is now
 * entitled to into every project that's missing them. It NEVER deletes folders, so
 * a downgrade keeps prior folders — only newly-enabled apps get backfilled.
 *
 * Intended seam: call after an app subscription is added (the Stripe webhook is the
 * sole sub-writer and can't be edited, so this runs as reconcile-on-read — e.g. on
 * app entry or right after an upgrade flow).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateProjectFolderTree } from "@/lib/slatedrop/folder-generator";
import { resolveEntitledAppsForProvisioning } from "@/lib/slatedrop/entitled-apps";
import { isOwnerEmail } from "@/lib/server/beta-access";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const orgId = membership?.org_id ?? null;
  const isSlateCeo = isOwnerEmail(user.email);

  const enabledApps = await resolveEntitledAppsForProvisioning(admin, orgId, { isSlateCeo });

  // The caller's projects (org-scoped, else solo by created_by).
  let projectQuery = admin.from("projects").select("id, name");
  projectQuery = orgId ? projectQuery.eq("org_id", orgId) : projectQuery.eq("created_by", user.id);
  const { data: projects, error } = await projectQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sequential: the idempotency guard is read-then-insert (not a unique index), so
  // serial provisioning avoids racing duplicate folders.
  let processed = 0;
  const failures: string[] = [];
  for (const p of projects ?? []) {
    const id = p.id as string;
    try {
      await generateProjectFolderTree(id, (p.name as string) ?? "Project", orgId, user.id, admin, enabledApps);
      processed += 1;
    } catch (e) {
      console.error("[backfill-app-folders] failed for project", id, e);
      failures.push(id);
    }
  }

  return NextResponse.json({
    ok: true,
    apps: Array.from(enabledApps),
    projectsProcessed: processed,
    projectsTotal: projects?.length ?? 0,
    failures,
  });
}
