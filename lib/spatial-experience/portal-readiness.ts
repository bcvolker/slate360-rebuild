import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { PACKAGE_DELIVERABLES } from "./portal-package";

type Admin = ReturnType<typeof createAdminClient>;
type Offered = (typeof PACKAGE_DELIVERABLES)[number];

export type DeliverableReadiness = { ready: boolean; note: string };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Operator-only readiness lines for the Client portal panel. A packaged deliverable
 * that is not ready stays out of the client portal; this tells the operator why.
 */
export async function loadPortalReadiness(admin: Admin, projectId: string): Promise<{
  readiness: Record<Offered, DeliverableReadiness>;
  previewWalkthroughId: string | null;
}> {
  const [{ data: walks }, { data: shareable }, { data: tours }, { data: twins }, { data: pins }, { data: planSheets }] = await Promise.all([
    // Walkthroughs a client can actually play (at least one ready clip).
    admin
      .from("spatial_walkthroughs")
      .select("id, status, captured_at, spatial_clips!inner(id)")
      .eq("project_id", projectId)
      .eq("spatial_clips.status", "ready")
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: false }),
    // Any shareable walkthrough anchors a portal link, even one whose portal shows only stations or documents.
    admin
      .from("spatial_walkthroughs")
      .select("id")
      .eq("project_id", projectId)
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: false })
      .limit(1),
    admin.from("project_tours").select("id").eq("project_id", projectId).eq("status", "published").limit(1),
    admin
      .from("digital_twin_spaces")
      .select("id, settings")
      .eq("project_id", projectId)
      .not("published_model_id", "is", null)
      .is("deleted_at", null),
    admin.from("spatial_pins").select("id").eq("project_id", projectId).in("visibility", ["client", "public"]),
    admin.from("site_walk_plan_sheets").select("id, rasterized_key, thumbnail_s3_key, image_s3_key").eq("project_id", projectId).limit(8),
  ]);

  const pinIds = (pins ?? []).map((p) => p.id as string);
  const { count: docCount } = pinIds.length
    ? await admin.from("spatial_pin_attachments").select("id", { count: "exact", head: true }).in("pin_id", pinIds)
    : { count: 0 };

  const walkCount = (walks ?? []).length;
  const twinAccepted = (twins ?? []).some((s) => {
    const st = (s.settings as { qaStatus?: string; localQa?: string; humanReviewAccepted?: boolean } | null) ?? {};
    return (st.qaStatus ?? st.localQa) === "accepted" && st.humanReviewAccepted === true;
  });
  const docs = docCount ?? 0;

  return {
    previewWalkthroughId: (shareable?.[0]?.id as string | undefined) ?? null,
    readiness: {
      walkthrough: walkCount
        ? { ready: true, note: plural(walkCount, "walkthrough ready", "walkthroughs ready") }
        : { ready: false, note: "No walkthrough is ready to share" },
      stations: tours?.length
        ? { ready: true, note: "Published station tour" }
        : { ready: false, note: "No published station tour" },
      plan: (planSheets ?? []).some((sheet) => sheet.rasterized_key || sheet.thumbnail_s3_key || sheet.image_s3_key)
        ? { ready: true, note: "Drawing sheet ready" }
        : { ready: false, note: "No drawing sheet ready" },
      twin: twinAccepted
        ? { ready: true, note: "Accepted in QA" }
        : { ready: false, note: (twins ?? []).length ? "Waiting on QA acceptance" : "No published twin" },
      evidence: docs
        ? { ready: true, note: plural(docs, "document on client items", "documents on client items") }
        : { ready: false, note: "No documents on client-visible items" },
      issues: pinIds.length
        ? { ready: true, note: plural(pinIds.length, "client-visible item", "client-visible items") }
        : { ready: walkCount > 0, note: "No items yet · clients can ask questions from the walkthrough" },
    },
  };
}
