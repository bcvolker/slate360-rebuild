import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import {
  buildDirectedWalkOverlay,
  emptyOverlay,
  type DirectedWalkOverlay,
  type PathSample,
  type PinAnchor,
  type SheetSample,
} from "./directed-walk-plan";
import { readRegistration, readWaypointSpace, timePins } from "./directed-walk-registration";
import { loadShareRow, shareDenied } from "./share-resolve";

const SIGN_EXPIRES_SECONDS = 3600;

export type PortalPlanSheetModel = {
  id: string;
  sheetNumber: string;
  title: string;
  imageUrl: string | null;
  width: number;
  height: number;
};

export type PortalPlanWalkModel = {
  title: string;
  token: string;
  sheets: PortalPlanSheetModel[];
  overlays: Record<string, DirectedWalkOverlay>;
};

type SheetRow = {
  id: string;
  sheet_number: number;
  sheet_name: string | null;
  image_s3_key: string | null;
  thumbnail_s3_key: string | null;
  rasterized_key: string | null;
  rasterized_width: number | null;
  rasterized_height: number | null;
  width: number | null;
  height: number | null;
};

function imageKey(sheet: SheetRow): string | null {
  return sheet.rasterized_key ?? sheet.thumbnail_s3_key ?? sheet.image_s3_key;
}

async function sign(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: SIGN_EXPIRES_SECONDS });
  } catch {
    return null;
  }
}

/** Plan sheets for this share, with the directed walk drawn on the registered sheet. */
export async function loadPortalPlanWalk(token: string): Promise<PortalPlanWalkModel | null> {
  const { admin, row } = await loadShareRow(token);
  if (!row || shareDenied(row)) return null;
  const blank: PortalPlanWalkModel = { title: "Plans", token, sheets: [], overlays: {} };
  const { data: walk } = await admin
    .from("spatial_walkthroughs")
    .select("id, project_id")
    .eq("id", row.walkthrough_id)
    .eq("org_id", row.org_id)
    .maybeSingle();
  if (!walk?.project_id) return blank;

  const { data: sets } = await admin
    .from("site_walk_plan_sets")
    .select("id, title, metadata")
    .eq("project_id", walk.project_id)
    .neq("processing_status", "archived")
    .order("is_current_revision", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);
  const set = sets?.[0];
  if (!set) return blank;

  const [{ data: sheetRows }, { data: waypoints }, { data: marks }, { data: tours }] = await Promise.all([
    admin
      .from("site_walk_plan_sheets")
      .select("id, sheet_number, sheet_name, image_s3_key, thumbnail_s3_key, rasterized_key, rasterized_width, rasterized_height, width, height, sort_order")
      .eq("plan_set_id", set.id)
      .order("sort_order", { ascending: true }),
    admin.from("spatial_waypoints").select("id, clip_id, t_seconds, label, xyz, is_visible").eq("walkthrough_id", walk.id),
    admin.from("spatial_checkpoint_marks").select("checkpoint_id, clip_id, t_seconds, match").eq("walkthrough_id", walk.id),
    admin.from("project_tours").select("id").eq("project_id", walk.project_id).eq("plan_set_id", set.id).eq("status", "published"),
  ]);

  const sheets = ((sheetRows ?? []) as SheetRow[]).filter((sheet) => imageKey(sheet));
  const tourIds = (tours ?? []).map((tour) => String(tour.id));
  const markRows = (marks ?? []) as Array<{ checkpoint_id: string; clip_id: string | null; t_seconds: number | null; match: string }>;
  const checkpointIds = [...new Set(markRows.map((mark) => mark.checkpoint_id))];
  const [{ data: pinRows }, { data: checkpointRows }] = await Promise.all([
    tourIds.length
      ? admin.from("tour_plan_pins").select("id, plan_sheet_id, x_pct, y_pct, pin_number, title, sort_order").in("tour_id", tourIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    checkpointIds.length
      ? admin.from("spatial_route_checkpoints").select("id, label, sort_order").in("id", checkpointIds)
      : Promise.resolve({ data: [] as Array<{ id: string; label: string | null; sort_order: number }> }),
  ]);

  const reg = readRegistration(set.metadata);
  const path: PathSample[] = [];
  const sheetPath: SheetSample[] = [];
  const labeled: Array<{ label: string; t: number; clipId: string | null }> = [];
  for (const waypoint of [...(waypoints ?? [])].filter((item) => item.is_visible !== false).sort((a, b) => Number(a.t_seconds) - Number(b.t_seconds))) {
    const t = Number(waypoint.t_seconds);
    if (!Number.isFinite(t)) continue;
    const label = typeof waypoint.label === "string" ? waypoint.label : null;
    const clipId = typeof waypoint.clip_id === "string" ? waypoint.clip_id : null;
    if (label) labeled.push({ label, t, clipId });
    const space = readWaypointSpace(waypoint.xyz);
    if (!space) continue;
    const sample = { id: String(waypoint.id), t, clipId, segmentId: space.segmentId, label };
    if (space.kind === "path") path.push({ ...sample, x: space.x, y: space.y });
    else sheetPath.push({ ...sample, u: space.u, v: space.v });
  }

  const checkpointById = new Map((checkpointRows ?? []).map((item) => [String(item.id), item]));
  const orderedMarks = markRows
    .filter((mark) => mark.match !== "not_captured" && mark.t_seconds != null && Number.isFinite(Number(mark.t_seconds)))
    .map((mark) => {
      const checkpoint = checkpointById.get(mark.checkpoint_id);
      const label = typeof checkpoint?.label === "string" ? checkpoint.label : "";
      return { t: Number(mark.t_seconds), clipId: mark.clip_id, label, sort: Number(checkpoint?.sort_order ?? 0) };
    })
    .sort((a, b) => a.sort - b.sort || a.t - b.t);
  for (const mark of orderedMarks) if (mark.label) labeled.push(mark);

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const located = ((pinRows ?? []) as Array<Record<string, unknown>>)
    .filter((pin) => sheetIds.has(String(pin.plan_sheet_id)))
    .map((pin) => ({
      sheetId: String(pin.plan_sheet_id),
      sort: Number(pin.pin_number ?? pin.sort_order ?? 0),
      pin: {
        id: String(pin.id),
        u: Number(pin.x_pct) / 100,
        v: Number(pin.y_pct) / 100,
        t: null,
        label: typeof pin.title === "string" ? pin.title : null,
      } satisfies PinAnchor,
    }))
    .sort((a, b) => a.sort - b.sort);

  const canPlacePath = (path.length >= 2 && Boolean(reg.frame || reg.anchors.length >= 2)) || sheetPath.length >= 2;
  const pinSheet = sheetWithMostPins(located);
  const targetId =
    (reg.sheetId && sheetIds.has(reg.sheetId) ? reg.sheetId : null) ??
    (sheets.length === 1 ? sheets[0].id : null) ??
    (!canPlacePath ? pinSheet : null) ??
    sheets[0]?.id ??
    null;
  const timed = timePins(
    located.filter((pin) => pin.sheetId === targetId).map((pin) => pin.pin),
    labeled,
    orderedMarks,
  );
  const overlay = buildDirectedWalkOverlay({
    frame: reg.frame,
    anchors: reg.anchors,
    accuracyHint: reg.accuracy,
    path,
    sheetPath,
    pins: timed.pins,
    pinTiming: timed.timing,
  });
  const elsewhere = overlay.points.length ? "The walk route is on another sheet in this set." : overlay.note;

  const models: PortalPlanSheetModel[] = [];
  const overlays: Record<string, DirectedWalkOverlay> = {};
  for (const sheet of sheets) {
    models.push({
      id: sheet.id,
      sheetNumber: String(sheet.sheet_number),
      title: sheet.sheet_name || `Sheet ${sheet.sheet_number}`,
      imageUrl: await sign(imageKey(sheet)),
      width: sheet.rasterized_width || sheet.width || 1600,
      height: sheet.rasterized_height || sheet.height || 1100,
    });
    overlays[sheet.id] = sheet.id === targetId ? overlay : emptyOverlay(elsewhere);
  }
  return { title: typeof set.title === "string" && set.title ? set.title : "Plans", token, sheets: models, overlays };
}

function sheetWithMostPins(pins: Array<{ sheetId: string }>): string | null {
  const counts = new Map<string, number>();
  for (const pin of pins) counts.set(pin.sheetId, (counts.get(pin.sheetId) ?? 0) + 1);
  let best: string | null = null;
  let count = 0;
  for (const [id, n] of counts) {
    if (n > count) {
      best = id;
      count = n;
    }
  }
  return count >= 2 ? best : null;
}
