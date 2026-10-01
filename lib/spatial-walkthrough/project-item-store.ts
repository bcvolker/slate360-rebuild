import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ITEM_VISIBILITY,
  PROJECT_ITEM_PRIORITIES,
  PROJECT_ITEM_STATUSES,
  PROJECT_ITEM_TYPES,
  toProjectItem,
  type ItemAudience,
  type ProjectItem,
  type ProjectItemLocator,
  type ProjectItemPriority,
  type ProjectItemStatus,
  type ProjectItemType,
  type ItemVisibility,
} from "./project-items";
import { toProjectDocument, type ProjectDocument } from "./project-documents";
import { activityKindFromEvent, inAppNotificationCopy, makeItemEvent, planNotifications, type ItemEventKind } from "./item-events";

export function toLocator(row: Record<string, unknown>): ProjectItemLocator {
  return {
    id: String(row.id),
    walkthroughId: row.walkthrough_id ? String(row.walkthrough_id) : null,
    clipId: row.clip_id ? String(row.clip_id) : null,
    chapterId: row.chapter_id ? String(row.chapter_id) : null,
    tSeconds: row.t_seconds == null ? null : Number(row.t_seconds),
    yawDeg: row.yaw_deg == null ? null : Number(row.yaw_deg),
    pitchDeg: row.pitch_deg == null ? null : Number(row.pitch_deg),
  };
}

export async function loadLocators(admin: SupabaseClient, itemIds: string[]): Promise<Map<string, ProjectItemLocator[]>> {
  const map = new Map<string, ProjectItemLocator[]>();
  if (!itemIds.length) return map;
  const { data } = await admin.from("spatial_project_item_locators").select("*").in("item_id", itemIds);
  for (const row of data ?? []) {
    const id = String(row.item_id);
    const list = map.get(id) ?? [];
    list.push(toLocator(row as Record<string, unknown>));
    map.set(id, list);
  }
  return map;
}

export async function loadProjectItems(
  admin: SupabaseClient,
  args: { orgId: string; projectId: string },
): Promise<ProjectItem[]> {
  const { data } = await admin
    .from("spatial_project_items")
    .select("*")
    .eq("org_id", args.orgId)
    .eq("project_id", args.projectId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const locators = await loadLocators(admin, rows.map((r) => String(r.id)));
  return rows.map((row) => toProjectItem(row, locators.get(String(row.id)) ?? []));
}

export async function loadItemRow(
  admin: SupabaseClient,
  args: { orgId: string; itemId: string },
): Promise<{ row: Record<string, unknown>; item: ProjectItem } | null> {
  const { data } = await admin
    .from("spatial_project_items")
    .select("*")
    .eq("org_id", args.orgId)
    .eq("id", args.itemId)
    .maybeSingle();
  if (!data) return null;
  const locators = await loadLocators(admin, [args.itemId]);
  return { row: data as Record<string, unknown>, item: toProjectItem(data as Record<string, unknown>, locators.get(args.itemId) ?? []) };
}

export async function insertLocator(
  admin: SupabaseClient,
  orgId: string,
  itemId: string,
  locator: ProjectItemLocator,
): Promise<void> {
  await admin.from("spatial_project_item_locators").insert({
    org_id: orgId,
    item_id: itemId,
    walkthrough_id: locator.walkthroughId,
    clip_id: locator.clipId,
    chapter_id: locator.chapterId,
    t_seconds: locator.tSeconds,
    yaw_deg: locator.yawDeg,
    pitch_deg: locator.pitchDeg,
  });
}

export async function emitItemEvent(
  admin: SupabaseClient,
  args: {
    orgId: string;
    event: ReturnType<typeof makeItemEvent>;
    audience?: ItemAudience;
  },
): Promise<void> {
  try {
    await admin.from("spatial_project_item_activity").insert({
      org_id: args.orgId,
      item_id: args.event.itemId,
      kind: activityKindFromEvent(args.event.kind),
      actor_id: args.event.actorId,
      payload: args.event.payload,
    });
  } catch {
    // activity is best-effort
  }
  const plan = planNotifications(args.event);
  const copy = inAppNotificationCopy(args.event);
  const assigneeId = typeof args.event.payload.assigneeId === "string" ? args.event.payload.assigneeId : null;
  if (copy && plan.some((p) => p.channel === "in_app" && p.status === "queued") && assigneeId) {
    try {
      await admin.from("project_notifications").insert({
        user_id: assigneeId,
        project_id: args.event.projectId,
        title: copy.title,
        message: copy.message,
        link_path: copy.linkPath,
      });
    } catch {
      // in-app is best-effort; email/push stay stubbed
    }
  }
}

export function parseItemType(value: unknown): ProjectItemType {
  return PROJECT_ITEM_TYPES.includes(value as ProjectItemType) ? (value as ProjectItemType) : "general";
}

export function parseStatus(value: unknown): ProjectItemStatus {
  return PROJECT_ITEM_STATUSES.includes(value as ProjectItemStatus) ? (value as ProjectItemStatus) : "open";
}

export function parsePriority(value: unknown): ProjectItemPriority {
  return PROJECT_ITEM_PRIORITIES.includes(value as ProjectItemPriority) ? (value as ProjectItemPriority) : "normal";
}

export function parseVisibility(value: unknown, fallback: ItemVisibility = "client"): ItemVisibility {
  return ITEM_VISIBILITY.includes(value as ItemVisibility) ? (value as ItemVisibility) : fallback;
}

export async function loadDocumentsForItems(
  admin: SupabaseClient,
  itemIds: string[],
): Promise<Map<string, ProjectDocument[]>> {
  const map = new Map<string, ProjectDocument[]>();
  if (!itemIds.length) return map;
  const { data: links } = await admin.from("spatial_project_item_files").select("item_id, document_id").in("item_id", itemIds);
  const docIds = [...new Set((links ?? []).map((l) => String(l.document_id)))];
  if (!docIds.length) return map;
  const { data: docs } = await admin.from("spatial_project_documents").select("*").in("id", docIds);
  const byId = new Map((docs ?? []).map((d) => [String(d.id), toProjectDocument(d as Record<string, unknown>)]));
  for (const link of links ?? []) {
    const doc = byId.get(String(link.document_id));
    if (!doc) continue;
    const list = map.get(String(link.item_id)) ?? [];
    list.push(doc);
    map.set(String(link.item_id), list);
  }
  return map;
}

export function kindFromPatch(status?: ProjectItemStatus | null, prev?: ProjectItemStatus | null): ItemEventKind | null {
  if (!status || status === prev) return null;
  if (status === "closed") return "closed";
  return "status_changed";
}
