import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBrandTheme } from "./theme";
import type { BrandTheme } from "./types";

export type CaptureEpoch = {
  date: string; // yyyy-mm-dd, the grouping key
  walkthroughs: Array<{
    id: string;
    title: string;
    capturedAt: string;
    building: string | null;
    floor: string | null;
    status: string;
    posterUrl: string | null;
    href: string;
  }>;
  twinReady: boolean;
};

export type PortalItemSummary = {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  visibility: string;
  createdAt: string;
  commentCount: number;
  locatorHref: string | null;
  thumbnailUrl: string | null;
};

export type PortalDocumentSummary = {
  id: string;
  type: string;
  title: string;
  createdAt: string;
};

export type PortalData = {
  project: { id: string; name: string; location: string | null; clientName: string | null };
  brand: BrandTheme;
  companyName: string;
  hero: CaptureEpoch["walkthroughs"][number] | null;
  epochs: CaptureEpoch[];
  twin: { spaceId: string; title: string; modelId: string } | null;
  compareAvailable: boolean;
  items: PortalItemSummary[];
  documents: PortalDocumentSummary[];
};

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

async function posterFor(
  admin: ReturnType<typeof createAdminClient>,
  walkthroughId: string,
  mediaBase: (walkthroughId: string, clipId: string) => string,
): Promise<string | null> {
  const { data } = await admin
    .from("spatial_clips")
    .select("id, poster_key")
    .eq("walkthrough_id", walkthroughId)
    .eq("status", "ready")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!data?.poster_key) return null;
  // The raw R2 key never reaches the client — callers pass a URL builder
  // that points at whichever media proxy fits the caller (authed creator
  // route vs. token-scoped public portal route); both stream by clip id,
  // never by key.
  return mediaBase(walkthroughId, data.id);
}

export type PortalDataOptions = {
  /** Builds the poster URL for a clip. Creator pages use the authed media
   * route; the client portal uses the token-scoped `/api/portal/[token]/media` route. */
  mediaBase: (walkthroughId: string, clipId: string) => string;
  /** Narrows items/documents for the client portal. Omit for the creator's
   * own project page (sees everything, including internal items). */
  visibleTo?: { visibilities: string[]; includeInternal: boolean } | null;
};

/**
 * Assembles one project's portal view: capture history grouped into epochs,
 * the hero (latest ready walkthrough), Twin readiness, items and documents.
 */
export async function loadPortalData(projectId: string, orgId: string, opts: PortalDataOptions): Promise<PortalData> {
  const admin = createAdminClient();
  const visibleTo = opts.visibleTo ?? null;

  const [{ data: project }, { data: theme }, { data: org }] = await Promise.all([
    admin.from("projects").select("id, name, location").eq("id", projectId).eq("org_id", orgId).maybeSingle(),
    admin.from("spatial_org_themes").select("*").eq("org_id", orgId).maybeSingle(),
    admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);

  const { data: walkthroughsRaw } = await admin
    .from("spatial_walkthroughs")
    .select("id, title, captured_at, building, floor, status")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .in("status", ["ready", "published"])
    .order("captured_at", { ascending: false });

  const walkthroughs = walkthroughsRaw ?? [];
  const posters = await Promise.all(walkthroughs.map((w) => posterFor(admin, w.id, opts.mediaBase)));

  const epochMap = new Map<string, CaptureEpoch>();
  walkthroughs.forEach((w, i) => {
    const key = dateKey(w.captured_at);
    const entry: CaptureEpoch["walkthroughs"][number] = {
      id: w.id,
      title: w.title,
      capturedAt: w.captured_at,
      building: w.building,
      floor: w.floor,
      status: w.status,
      posterUrl: posters[i],
      href: `/projects/${projectId}/walkthroughs/${w.id}`,
    };
    const existing = epochMap.get(key);
    if (existing) existing.walkthroughs.push(entry);
    else epochMap.set(key, { date: key, walkthroughs: [entry], twinReady: false });
  });
  const epochs = [...epochMap.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  const hero = epochs[0]?.walkthroughs[0] ?? null;

  const { data: twinSpace } = await admin
    .from("digital_twin_spaces")
    .select("id, title, published_model_id")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .not("published_model_id", "is", null)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const twin = twinSpace?.published_model_id
    ? { spaceId: twinSpace.id, title: twinSpace.title, modelId: twinSpace.published_model_id }
    : null;
  if (twin) epochs.forEach((e) => { e.twinReady = true; });

  const { count: compareCount } = await admin
    .from("spatial_compare_anchors")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const compareAvailable = (compareCount ?? 0) > 0 || epochs.length >= 2;

  let itemsQuery = admin
    .from("spatial_project_items")
    .select("id, type, title, status, priority, visibility, created_at, pin_id")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (visibleTo && !visibleTo.includeInternal) {
    itemsQuery = itemsQuery.in("visibility", visibleTo.visibilities);
  }
  const { data: itemRows } = await itemsQuery;
  const itemIds = (itemRows ?? []).map((r) => r.id);
  const [{ data: commentCounts }, { data: locators }] = await Promise.all([
    itemIds.length
      ? admin.from("spatial_project_item_comments").select("item_id").in("item_id", itemIds)
      : Promise.resolve({ data: [] as Array<{ item_id: string }> }),
    itemIds.length
      ? admin.from("spatial_project_item_locators").select("item_id, walkthrough_id, clip_id, t_seconds, yaw_deg, pitch_deg").in("item_id", itemIds)
      : Promise.resolve({ data: [] as Array<{ item_id: string; walkthrough_id: string | null; clip_id: string | null; t_seconds: number | null; yaw_deg: number | null; pitch_deg: number | null }> }),
  ]);
  const commentCountByItem = new Map<string, number>();
  (commentCounts ?? []).forEach((c) => commentCountByItem.set(c.item_id, (commentCountByItem.get(c.item_id) ?? 0) + 1));
  const locatorByItem = new Map((locators ?? []).map((l) => [l.item_id, l]));

  const items: PortalItemSummary[] = (itemRows ?? []).map((r) => {
    const loc = locatorByItem.get(r.id);
    const locatorHref =
      loc?.walkthrough_id && loc.clip_id
        ? `/w/${loc.walkthrough_id}?clip=${loc.clip_id}&t=${loc.t_seconds ?? 0}&yaw=${loc.yaw_deg ?? 0}&pitch=${loc.pitch_deg ?? 0}`
        : null;
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      status: r.status,
      priority: r.priority,
      visibility: r.visibility,
      createdAt: r.created_at,
      commentCount: commentCountByItem.get(r.id) ?? 0,
      locatorHref,
      thumbnailUrl: null,
    };
  });

  const { data: docRows } = await admin
    .from("spatial_project_documents")
    .select("id, type, title, created_at")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  const documents: PortalDocumentSummary[] = (docRows ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    title: d.title,
    createdAt: d.created_at,
  }));

  const brand = resolveBrandTheme({ org: theme, canHidePoweredBy: true });

  return {
    project: project
      ? { id: project.id, name: project.name, location: project.location ?? null, clientName: org?.name ?? null }
      : { id: projectId, name: "Project", location: null, clientName: null },
    brand,
    companyName: org?.name || project?.name || "Slate360",
    hero,
    epochs,
    twin,
    compareAvailable,
    items,
    documents,
  };
}
