import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { ITEMS_LOAD_ERROR } from "./item-language";
import { assembleClientItem, type ItemSourceRow } from "./assemble-items";
import type { LocatorPinEvidence } from "./derive-locators";
import type { VnextClientItem } from "./item-types";

export type VnextAdmin = ReturnType<typeof createAdminClient>;

const ITEM_COLUMNS =
  "id, title, description, item_type, item_status, priority, trade, category, tags, location_label, latitude, longitude, captured_at, session_id, s3_key, before_item_id, project_id";

export type ItemsReadResult =
  | { ok: true; items: VnextClientItem[] }
  | { ok: false; error: string };

async function renderableSheetIds(admin: VnextAdmin, projectId: string): Promise<Set<string>> {
  const published = publishedIdSet(await readProjectPublications(admin, projectId), projectId, "plans");
  const { data } = await admin
    .from("site_walk_plan_sheets")
    .select("id, thumbnail_s3_key, rasterized_key, image_s3_key")
    .eq("project_id", projectId);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (planSheetHasImage(row) && published.has(row.id)) ids.add(row.id);
  }
  return ids;
}

async function publishedPanoramaIds(admin: VnextAdmin, projectId: string): Promise<Set<string>> {
  return publishedIdSet(await readProjectPublications(admin, projectId), projectId, "pano360");
}

async function projectSessionIds(admin: VnextAdmin, projectId: string, sessionIds: string[]): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const { data } = await admin
    .from("site_walk_sessions")
    .select("id")
    .eq("project_id", projectId)
    .in("id", sessionIds);
  return new Set((data ?? []).map((row) => row.id));
}

async function pinsForItems(admin: VnextAdmin, projectId: string, itemIds: string[]): Promise<LocatorPinEvidence[]> {
  if (itemIds.length === 0) return [];
  const { data } = await admin
    .from("site_walk_pins")
    .select("item_id, project_id, plan_sheet_id, x_pct, y_pct")
    .eq("project_id", projectId)
    .in("item_id", itemIds);
  return (data ?? []).map((row) => ({
    itemId: row.item_id,
    projectId: row.project_id,
    planSheetId: row.plan_sheet_id,
    xPct: row.x_pct,
    yPct: row.y_pct,
  }));
}

async function commentCounts(admin: VnextAdmin, projectId: string, itemIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (itemIds.length === 0) return counts;
  const { data } = await admin
    .from("site_walk_comments")
    .select("item_id")
    .eq("project_id", projectId)
    .in("item_id", itemIds);
  for (const row of data ?? []) {
    if (!row.item_id) continue;
    counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1);
  }
  return counts;
}

function titlesById(rows: ItemSourceRow[]): Map<string, string> {
  const titles = new Map<string, string>();
  for (const row of rows) titles.set(row.id, row.title?.trim() || "Untitled item");
  return titles;
}

export async function readProjectItems(admin: VnextAdmin, projectId: string): Promise<ItemsReadResult> {
  let query = admin.from("site_walk_items").select(ITEM_COLUMNS).eq("project_id", projectId);
  query = excludeDeletedSiteWalkItems(query);
  const { data, error } = await query.order("captured_at", { ascending: false });
  if (error) return { ok: false, error: ITEMS_LOAD_ERROR };

  const rows = (data ?? []) as ItemSourceRow[];
  const itemIds = rows.map((row) => row.id);
  const sessionIds = rows.map((row) => row.session_id).filter((id): id is string => Boolean(id));
  const [sheets, panoramas, sessions, pins, counts] = await Promise.all([
    renderableSheetIds(admin, projectId),
    publishedPanoramaIds(admin, projectId),
    projectSessionIds(admin, projectId, sessionIds),
    pinsForItems(admin, projectId, itemIds),
    commentCounts(admin, projectId, itemIds),
  ]);
  const titles = titlesById(rows);

  return {
    ok: true,
    items: rows.map((row) =>
      assembleClientItem(row, {
        projectId,
        pins,
        renderableSheetIds: sheets,
        publishedPanoramaIds: panoramas,
        sessionIds: sessions,
        commentCount: counts.get(row.id) ?? 0,
        relatedTitle: row.before_item_id ? titles.get(row.before_item_id) ?? null : null,
      }),
    ),
  };
}

async function relatedTitle(
  admin: VnextAdmin,
  projectId: string,
  beforeItemId: string | null,
): Promise<string | null> {
  if (!beforeItemId) return null;
  let query = admin
    .from("site_walk_items")
    .select("id, title")
    .eq("project_id", projectId)
    .eq("id", beforeItemId);
  query = excludeDeletedSiteWalkItems(query);
  const { data } = await query.maybeSingle();
  return data?.title?.trim() || (data ? "Untitled item" : null);
}

export async function readProjectItem(
  admin: VnextAdmin,
  projectId: string,
  itemId: string,
): Promise<{ ok: true; item: VnextClientItem | null } | { ok: false; error: string }> {
  let query = admin.from("site_walk_items").select(ITEM_COLUMNS).eq("project_id", projectId).eq("id", itemId);
  query = excludeDeletedSiteWalkItems(query);
  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false, error: ITEMS_LOAD_ERROR };
  if (!data) return { ok: true, item: null };

  const row = data as ItemSourceRow;
  const sessionIds = row.session_id ? [row.session_id] : [];
  const [sheets, panoramas, sessions, pins, counts, related] = await Promise.all([
    renderableSheetIds(admin, projectId),
    publishedPanoramaIds(admin, projectId),
    projectSessionIds(admin, projectId, sessionIds),
    pinsForItems(admin, projectId, [row.id]),
    commentCounts(admin, projectId, [row.id]),
    relatedTitle(admin, projectId, row.before_item_id),
  ]);

  return {
    ok: true,
    item: assembleClientItem(row, {
      projectId,
      pins,
      renderableSheetIds: sheets,
      publishedPanoramaIds: panoramas,
      sessionIds: sessions,
      commentCount: counts.get(row.id) ?? 0,
      relatedTitle: related,
    }),
  };
}
