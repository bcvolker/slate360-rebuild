/**
 * Public deliverable loader — resolves a 32+ char share token to a
 * normalised `ViewerDeliverable`. Uses admin client because viewers are
 * anonymous; the share token itself is the access control.
 *
 * Honours `share_revoked`, `share_expires_at`, and `share_max_views`.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ViewerDeliverable,
  ViewerItem,
  MetadataVisibility,
  ViewerPlanSheet,
  ViewerPlanPin,
} from "./viewer-types";

interface DeliverableRow {
  id: string;
  title: string | null;
  content: unknown;
  created_by: string;
  share_token: string;
  share_revoked: boolean | null;
  share_expires_at: string | null;
  share_max_views: number | null;
  share_view_count: number | null;
  shared_snapshot_id: string | null;
  session_id: string | null;
}

interface SnapshotRow {
  snapshot_title: string | null;
  snapshot_content: unknown;
}

interface CreatorRow {
  full_name: string | null;
  org_id: string | null;
}

interface OrgBrandingRow {
  name: string | null;
  logo_url: string | null;
}

function isValidToken(token: string): boolean {
  return typeof token === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

function normaliseItems(
  content: unknown,
  mediaUrlFor: (mediaItemId: string) => string,
): ViewerItem[] {
  if (!Array.isArray(content)) return [];
  const items: ViewerItem[] = [];
  for (const raw of content) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    const type = typeof r.type === "string" ? (r.type as ViewerItem["type"]) : null;
    const title = typeof r.title === "string" ? r.title : "";
    if (!id || !type) continue;
    const mediaItemId = typeof r.mediaItemId === "string" ? r.mediaItemId : undefined;
    const explicitUrl = typeof r.url === "string" ? r.url : undefined;
    items.push({
      id,
      type,
      title,
      mediaItemId,
      url: explicitUrl ?? (mediaItemId ? mediaUrlFor(mediaItemId) : undefined),
      notes: typeof r.notes === "string" ? r.notes : undefined,
      markupSvg: typeof r.markupSvg === "string" ? r.markupSvg : undefined,
      transcript: typeof r.transcript === "string" ? r.transcript : undefined,
      tourId: typeof r.tourId === "string" ? r.tourId : undefined,
      metadata:
        r.metadata && typeof r.metadata === "object"
          ? (r.metadata as ViewerItem["metadata"])
          : undefined,
    });
  }
  return items;
}

export async function loadDeliverableByToken(
  token: string
): Promise<ViewerDeliverable | null> {
  if (!isValidToken(token)) return null;

  const admin = createAdminClient();

  const { data: deliverable, error } = await admin
    .from("site_walk_deliverables")
    .select(
      "id, title, content, created_by, share_token, share_revoked, share_expires_at, share_max_views, share_view_count, shared_snapshot_id, session_id"
    )
    .eq("share_token", token)
    .maybeSingle<DeliverableRow>();

  if (error || !deliverable) return null;
  if (deliverable.share_revoked) return null;
  if (
    deliverable.share_expires_at &&
    new Date(deliverable.share_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  if (
    deliverable.share_max_views !== null &&
    deliverable.share_max_views !== undefined &&
    (deliverable.share_view_count ?? 0) >= deliverable.share_max_views
  ) {
    return null;
  }

  // Pin to the frozen version the link was shared at, when present. Older links
  // (shared before version pinning) fall back to the deliverable's live content.
  let resolvedTitle = deliverable.title ?? "Untitled Deliverable";
  let resolvedContent: unknown = deliverable.content;

  if (deliverable.shared_snapshot_id) {
    const { data: snapshot } = await admin
      .from("site_walk_deliverable_snapshots")
      .select("snapshot_title, snapshot_content")
      .eq("id", deliverable.shared_snapshot_id)
      .maybeSingle<SnapshotRow>();
    if (snapshot) {
      resolvedTitle = snapshot.snapshot_title ?? resolvedTitle;
      resolvedContent = snapshot.snapshot_content;
    }
  }

  return finishViewerDeliverable(
    admin,
    {
      id: deliverable.id,
      title: resolvedTitle,
      content: resolvedContent,
      created_by: deliverable.created_by,
      share_token: deliverable.share_token,
      session_id: deliverable.session_id,
    },
    (mediaItemId) => `/api/view/${deliverable.share_token}/media/${mediaItemId}`,
    (sheetId) => `/api/view/${deliverable.share_token}/plan-sheet/${sheetId}`,
  );
}

/**
 * Shared finisher used by BOTH the public (token) and owner (by-id) loaders:
 * resolves sender/branding + metadata visibility and normalizes items, baking the
 * media URLs with the caller-supplied builder (the ONLY thing that differs between
 * the two access paths). Keeping this single-source is what prevents the share and
 * owner viewers from drifting.
 */
export async function finishViewerDeliverable(
  admin: ReturnType<typeof createAdminClient>,
  base: {
    id: string;
    title: string | null;
    content: unknown;
    created_by: string;
    share_token: string | null;
    session_id?: string | null;
  },
  mediaUrlFor: (mediaItemId: string) => string,
  planSheetUrlFor?: (sheetId: string) => string,
): Promise<ViewerDeliverable> {
  let senderName = "Slate360 user";
  let senderLogo: string | undefined;

  const { data: creator } = await admin
    .from("profiles")
    .select("full_name, org_id")
    .eq("id", base.created_by)
    .maybeSingle<CreatorRow>();

  if (creator?.full_name) senderName = creator.full_name;

  if (creator?.org_id) {
    const { data: branding } = await admin
      .from("organizations")
      .select("name, logo_url")
      .eq("id", creator.org_id)
      .maybeSingle<OrgBrandingRow>();
    if (branding?.name) senderName = branding.name;
    if (branding?.logo_url) senderLogo = branding.logo_url;
  }

  // Default metadata visibility — all on for now.
  const metadataVisibility: MetadataVisibility = {
    timestamp: true,
    gps: true,
    weather: true,
    device: false,
    author: true,
  };

  const items = normaliseItems(base.content, mediaUrlFor);
  const { planSheets, planPins } = base.session_id && planSheetUrlFor
    ? await resolvePlanContext(admin, base.session_id, items, planSheetUrlFor)
    : { planSheets: undefined, planPins: undefined };

  return {
    id: base.id,
    title: base.title ?? "Untitled Deliverable",
    senderName,
    senderLogo,
    shareToken: base.share_token ?? "",
    items,
    metadataVisibility,
    planSheets,
    planPins,
  };
}

/**
 * Resolves the walk's plan sheets + pins for the deliverable's plan stage —
 * only the sheets a captured stop actually pinned, not the whole plan set.
 * Returns undefined fields (not empty arrays) when the walk used no plan, so
 * the viewer can cheaply check `deliverable.planSheets?.length` to decide
 * whether to offer the plan view at all.
 */
async function resolvePlanContext(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
  items: ViewerItem[],
  planSheetUrlFor: (sheetId: string) => string,
): Promise<{ planSheets?: ViewerPlanSheet[]; planPins?: ViewerPlanPin[] }> {
  const { data: pinRows } = await admin
    .from("site_walk_pins")
    .select("id, plan_sheet_id, x_pct, y_pct, pin_number, item_id")
    .eq("session_id", sessionId)
    .not("plan_sheet_id", "is", null);

  if (!pinRows || pinRows.length === 0) return {};

  const itemIds = new Set(items.map((it) => it.id));
  const sheetIds = [...new Set(pinRows.map((p) => p.plan_sheet_id as string))];

  const { data: sheetRows } = await admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_name, sheet_number, rasterized_key, rasterized_width, rasterized_height")
    .in("id", sheetIds);

  const readySheets = (sheetRows ?? []).filter((s) => s.rasterized_key);
  if (readySheets.length === 0) return {};
  const readySheetIds = new Set(readySheets.map((s) => s.id));

  const planSheets: ViewerPlanSheet[] = readySheets
    .sort((a, b) => (a.sheet_number ?? 0) - (b.sheet_number ?? 0))
    .map((s) => ({
      id: s.id,
      sheetName: s.sheet_name?.trim() || `Sheet ${s.sheet_number}`,
      sheetNumber: s.sheet_number ?? 0,
      width: s.rasterized_width ?? 0,
      height: s.rasterized_height ?? 0,
      imageUrl: planSheetUrlFor(s.id),
    }));

  const planPins: ViewerPlanPin[] = pinRows
    .filter((p) => readySheetIds.has(p.plan_sheet_id as string))
    .map((p) => ({
      id: p.id,
      planSheetId: p.plan_sheet_id as string,
      xPct: p.x_pct,
      yPct: p.y_pct,
      pinNumber: p.pin_number,
      // Only surface item links the recipient can actually see — a pin whose
      // item was deleted (or belongs to a different deliverable's snapshot)
      // must not appear clickable.
      itemId: p.item_id && itemIds.has(p.item_id) ? p.item_id : null,
    }));

  return { planSheets, planPins };
}
