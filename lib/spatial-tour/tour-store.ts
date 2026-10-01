import "server-only";

import { tasks } from "@trigger.dev/sdk/v3";
import type { createAdminClient } from "@/lib/supabase/admin";
import { resolveOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { maxPaintCoverage, paintSectors, paintVisibleInCone, parseLookCone } from "./look-cone";
import type {
  CheckpointMark,
  RouteChapter,
  RouteCheckpoint,
  TourBundle,
  TourRoute,
  TourVisit,
} from "./types";

type Admin = ReturnType<typeof createAdminClient>;
type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v == null ? null : Number(v));
const str = (v: unknown): string | null => (v == null ? null : String(v));

export function toMark(r: Row): CheckpointMark {
  return {
    id: String(r.id),
    checkpointId: String(r.checkpoint_id),
    walkthroughId: String(r.walkthrough_id),
    clipId: str(r.clip_id),
    tSeconds: num(r.t_seconds),
    yawDeg: Number(r.yaw_deg ?? 0),
    pitchDeg: Number(r.pitch_deg ?? 0),
    match: r.match as CheckpointMark["match"],
    stillKey: str(r.still_key),
    stillStatus: (r.still_status as CheckpointMark["stillStatus"]) ?? "none",
    stillError: str(r.still_error),
    stillBlackFraction: num(r.still_black_fraction),
  };
}

/** Everything the operator Tour page needs for one project (one route per project in the MVP). */
export async function loadTourBundle(admin: Admin, orgId: string, projectId: string): Promise<TourBundle> {
  const [{ data: routeRow }, { data: walks }] = await Promise.all([
    admin.from("spatial_routes").select("*").eq("project_id", projectId).eq("org_id", orgId).order("created_at").limit(1).maybeSingle(),
    admin
      .from("spatial_walkthroughs")
      .select("id, title, captured_at, route_id, client_published_at, stills_reviewed_at, privacy_reviewed_at, operator_patch, spatial_clips(id, duration_s, sort_order, status, public_proxy_key, look_cone, operator_patch)")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: true }),
  ]);

  const visits: TourVisit[] = (walks ?? []).map((w) => ({
    walkthroughId: String(w.id),
    title: String(w.title ?? "Visit"),
    capturedAt: str(w.captured_at),
    routeId: str(w.route_id),
    clientPublishedAt: str(w.client_published_at),
    stillsReviewedAt: str(w.stills_reviewed_at),
    privacyReviewedAt: str(w.privacy_reviewed_at),
    clips: ((w.spatial_clips as Row[] | null) ?? [])
      .filter((c) => c.status === "ready")
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((c) => {
        const lookCone = parseLookCone(c.look_cone);
        const sectors = paintSectors(resolveOperatorPatch(c.operator_patch, w.operator_patch));
        return {
          id: String(c.id),
          durationS: num(c.duration_s),
          sortOrder: Number(c.sort_order ?? 0),
          hasPublicProxy: Boolean(c.public_proxy_key),
          lookCone,
          maskVisible: lookCone ? paintVisibleInCone(sectors, lookCone) : false,
          maskCoverage: maxPaintCoverage(sectors),
        };
      }),
  }));

  if (!routeRow) return { route: null, chapters: [], checkpoints: [], visits, marks: [] };

  const route: TourRoute = {
    id: String(routeRow.id),
    projectId,
    name: String(routeRow.name),
    revision: Number(routeRow.revision ?? 1),
    captureNotes: str(routeRow.capture_notes),
  };
  const [{ data: chapterRows }, { data: checkpointRows }] = await Promise.all([
    admin.from("spatial_route_chapters").select("*").eq("route_id", route.id).order("sort_order"),
    admin.from("spatial_route_checkpoints").select("*").eq("route_id", route.id).order("sort_order"),
  ]);
  const checkpoints: RouteCheckpoint[] = (checkpointRows ?? []).map((c) => ({
    id: String(c.id),
    chapterId: String(c.route_chapter_id),
    label: String(c.label),
    captureNote: str(c.capture_note),
    sortOrder: Number(c.sort_order ?? 0),
    introducedInRevision: Number(c.introduced_in_revision ?? 1),
    retiredAt: str(c.retired_at),
    replacedBy: str(c.replaced_by),
  }));
  const { data: markRows } = checkpoints.length
    ? await admin.from("spatial_checkpoint_marks").select("*").in("checkpoint_id", checkpoints.map((c) => c.id))
    : { data: [] as Row[] };
  const chapters: RouteChapter[] = (chapterRows ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    sortOrder: Number(c.sort_order ?? 0),
    retiredAt: str(c.retired_at),
    replacedBy: str(c.replaced_by),
  }));
  return { route, chapters, checkpoints, visits, marks: (markRows ?? []).map(toMark) };
}

export async function loadOwnedRoute(admin: Admin, orgId: string, projectId: string): Promise<{ id: string; revision: number } | null> {
  const { data } = await admin
    .from("spatial_routes")
    .select("id, revision")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data ? { id: String(data.id), revision: Number(data.revision ?? 1) } : null;
}

/** Queue the still for one mark (Trigger → Modal frame grab from the public proxy). */
export async function enqueueCheckpointStill(admin: Admin, markId: string): Promise<void> {
  await admin.from("spatial_checkpoint_marks").update({ still_status: "queued", still_error: null }).eq("id", markId);
  try {
    await tasks.trigger("spatial-tour.checkpoint-still", { markId });
  } catch (e) {
    await admin
      .from("spatial_checkpoint_marks")
      .update({ still_status: "failed", still_error: `Could not queue: ${String(e).slice(0, 200)}` })
      .eq("id", markId);
  }
}
