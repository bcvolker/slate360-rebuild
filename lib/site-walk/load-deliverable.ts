/**
 * Public deliverable loader — resolves a 32+ char share token to a
 * normalised `ViewerDeliverable`. Uses admin client because viewers are
 * anonymous; the share token itself is the access control.
 *
 * Honours `share_revoked`, `share_expires_at`, and `share_max_views`.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { ViewerDeliverable, ViewerItem, MetadataVisibility } from "./viewer-types";

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
      "id, title, content, created_by, share_token, share_revoked, share_expires_at, share_max_views, share_view_count, shared_snapshot_id"
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
    },
    (mediaItemId) => `/api/view/${deliverable.share_token}/media/${mediaItemId}`,
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
  },
  mediaUrlFor: (mediaItemId: string) => string,
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

  return {
    id: base.id,
    title: base.title ?? "Untitled Deliverable",
    senderName,
    senderLogo,
    shareToken: base.share_token ?? "",
    items: normaliseItems(base.content, mediaUrlFor),
    metadataVisibility,
  };
}
