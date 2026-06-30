/**
 * POST /api/site-walk/deliverables/backfill-slatedrop
 *
 * One-time reconcile: register the org's EXISTING Site Walk deliverables into their
 * project's SlateDrop Deliverables folder. Deliverables created before the
 * registerDeliverableInSlateDrop wiring (or before a project was attached) have no
 * `deliverable://` link row, so they don't appear in the SlateDrop browser. This
 * backfills them. Idempotent (registration is keyed on the sentinel s3_key) and
 * additive-only — safe to re-run.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest } from "@/lib/server/api-response";
import { registerDeliverableInSlateDrop } from "@/lib/slatedrop/register-deliverable";

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    // Only project-scoped deliverables can be filed (register bails on a null project).
    const { data: deliverables, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, project_id, created_by")
      .eq("org_id", orgId)
      .not("project_id", "is", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let registered = 0;
    const failures: string[] = [];
    for (const d of deliverables ?? []) {
      try {
        await registerDeliverableInSlateDrop({
          admin,
          projectId: (d.project_id as string | null) ?? null,
          orgId,
          userId: d.created_by as string,
          deliverableId: d.id as string,
          title: (d.title as string | null) ?? "Untitled Report",
        });
        registered += 1;
      } catch {
        failures.push(d.id as string);
      }
    }

    return NextResponse.json({
      ok: true,
      total: deliverables?.length ?? 0,
      registered,
      failures,
    });
  });
