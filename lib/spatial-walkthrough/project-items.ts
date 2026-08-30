/** Optional project-management objects. Lightweight spatial pins remain independent. */

export const PROJECT_ITEM_TYPES = [
  "observation",
  "question",
  "issue",
  "safety",
  "punch",
  "rfi_reference",
  "submittal_reference",
  "voice_note",
  "general",
] as const;

export type ProjectItemType = (typeof PROJECT_ITEM_TYPES)[number];

export const PROJECT_ITEM_STATUSES = ["open", "in_progress", "waiting", "closed"] as const;
export type ProjectItemStatus = (typeof PROJECT_ITEM_STATUSES)[number];

export const PROJECT_ITEM_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ProjectItemPriority = (typeof PROJECT_ITEM_PRIORITIES)[number];

export const ITEM_VISIBILITY = [
  "internal",
  "client",
  "consultant",
  "subcontractor",
  "bidder",
  "public",
] as const;
export type ItemVisibility = (typeof ITEM_VISIBILITY)[number];

export const ITEM_AUDIENCES = [
  "contractor",
  "client",
  "consultant",
  "subcontractor",
  "bidder",
  "public",
] as const;
export type ItemAudience = (typeof ITEM_AUDIENCES)[number];

export const ACTION_ITEM_TYPES: ProjectItemType[] = ["observation", "issue", "safety", "punch"];

export type ProjectItemLocator = {
  id?: string;
  walkthroughId: string | null;
  clipId: string | null;
  chapterId: string | null;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
};

export type ProjectItem = {
  id: string;
  projectId: string;
  type: ProjectItemType;
  title: string;
  description: string | null;
  status: ProjectItemStatus;
  priority: ProjectItemPriority;
  assigneeId: string | null;
  dueDate: string | null;
  createdBy: string | null;
  guestKey: string | null;
  visibility: ItemVisibility;
  createdAt: string;
  closedAt: string | null;
  locators: ProjectItemLocator[];
};

export type ProjectItemComment = {
  id: string;
  itemId: string;
  authorId: string | null;
  text: string;
  voiceAssetId: string | null;
  fileDocumentId: string | null;
  createdAt: string;
};

export const ACTIVITY_KINDS = [
  "created",
  "commented",
  "assigned",
  "status_changed",
  "file_added",
  "closed",
] as const;
export type ProjectItemActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ProjectItemActivity = {
  id: string;
  itemId: string;
  kind: ProjectItemActivityKind;
  actorId: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

const VISIBLE: Record<ItemAudience, readonly ItemVisibility[]> = {
  contractor: ITEM_VISIBILITY,
  client: ["public", "client"],
  consultant: ["public", "client", "consultant"],
  subcontractor: ["public", "subcontractor"],
  bidder: ["public", "bidder"],
  public: ["public"],
};

export function audienceFromSharePolicy(policy: string | null | undefined): ItemAudience {
  if (policy === "public") return "public";
  if (policy === "consultant") return "consultant";
  if (policy === "subcontractor") return "subcontractor";
  if (policy === "bidder") return "bidder";
  return "client";
}

export function itemVisibleTo(
  visibility: ItemVisibility,
  audience: ItemAudience,
  createdBy?: string | null,
  viewerId?: string | null,
  guestKey?: string | null,
  viewerGuestKey?: string | null,
): boolean {
  if (audience === "contractor") return true;
  if (viewerId && createdBy && createdBy === viewerId) return true;
  if (viewerGuestKey && guestKey && guestKey === viewerGuestKey) return true;
  return VISIBLE[audience].includes(visibility);
}

/** Filter then count. Never return a hidden total. */
export function visibleItems<T extends { visibility: ItemVisibility; createdBy?: string | null; guestKey?: string | null }>(
  items: T[],
  audience: ItemAudience,
  viewerId?: string | null,
  viewerGuestKey?: string | null,
): T[] {
  return items.filter((item) =>
    itemVisibleTo(item.visibility, audience, item.createdBy, viewerId, item.guestKey, viewerGuestKey),
  );
}

export function summarizeVisible(
  items: Array<{ visibility: ItemVisibility; createdBy?: string | null; guestKey?: string | null }>,
  audience: ItemAudience,
  viewerId?: string | null,
  viewerGuestKey?: string | null,
): { count: number } {
  return { count: visibleItems(items, audience, viewerId, viewerGuestKey).length };
}

export function listPayload<T>(visible: T[]): { items: T[] } {
  return { items: visible };
}

export function isDiscussion(type: ProjectItemType): boolean {
  return type === "question";
}

export function pinIsLightweight(projectItemId?: string | null): boolean {
  return !projectItemId;
}

export function itemAccessDenied(
  item: { visibility: ItemVisibility; createdBy?: string | null; guestKey?: string | null } | null,
  audience: ItemAudience,
  viewerId?: string | null,
  viewerGuestKey?: string | null,
): boolean {
  if (!item) return true;
  return !itemVisibleTo(item.visibility, audience, item.createdBy, viewerId, item.guestKey, viewerGuestKey);
}

export function canCommentOnItem(args: { audience: ItemAudience; canAuthor: boolean }): boolean {
  if (args.canAuthor || args.audience === "contractor") return true;
  return args.audience === "client" || args.audience === "consultant" || args.audience === "subcontractor";
}

export function canManageItem(audience: ItemAudience, canAuthor: boolean): boolean {
  return canAuthor || audience === "contractor";
}

export function convertQuestionToAction(item: ProjectItem, type: ProjectItemType = "issue"): ProjectItem {
  const nextType = ACTION_ITEM_TYPES.includes(type) ? type : "issue";
  return {
    ...item,
    type: nextType,
    status: item.status === "closed" ? "open" : item.status,
    closedAt: item.status === "closed" ? null : item.closedAt,
  };
}

export function applyStatus(item: ProjectItem, status: ProjectItemStatus, at: string): ProjectItem {
  return {
    ...item,
    status,
    closedAt: status === "closed" ? at : null,
  };
}

export function walkthroughHref(args: {
  basePath: string;
  locator: ProjectItemLocator;
}): string {
  const params = new URLSearchParams();
  if (args.locator.clipId) params.set("clip", args.locator.clipId);
  if (args.locator.chapterId) params.set("chapter", args.locator.chapterId);
  if (args.locator.tSeconds != null) params.set("t", String(args.locator.tSeconds));
  if (args.locator.yawDeg != null) params.set("yaw", String(args.locator.yawDeg));
  if (args.locator.pitchDeg != null) params.set("pitch", String(args.locator.pitchDeg));
  const qs = params.toString();
  return qs ? `${args.basePath}?${qs}` : args.basePath;
}

export function captureAskLocator(view: {
  walkthroughId?: string | null;
  clipId?: string | null;
  chapterId?: string | null;
  t: number;
  yaw: number;
  pitch: number;
}): ProjectItemLocator {
  return {
    walkthroughId: view.walkthroughId ?? null,
    clipId: view.clipId ?? null,
    chapterId: view.chapterId ?? null,
    tSeconds: view.t,
    yawDeg: view.yaw,
    pitchDeg: view.pitch,
  };
}

export function toProjectItemComment(row: Record<string, unknown>): ProjectItemComment {
  return {
    id: String(row.id),
    itemId: String(row.item_id ?? row.itemId),
    authorId: row.author_id || row.authorId ? String(row.author_id ?? row.authorId) : null,
    text: String(row.body ?? row.text ?? ""),
    voiceAssetId: row.voice_asset_id || row.voiceAssetId ? String(row.voice_asset_id ?? row.voiceAssetId) : null,
    fileDocumentId: row.file_document_id || row.fileDocumentId ? String(row.file_document_id ?? row.fileDocumentId) : null,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export function toProjectItemActivity(row: Record<string, unknown>): ProjectItemActivity {
  return {
    id: String(row.id),
    itemId: String(row.item_id ?? row.itemId),
    kind: String(row.kind) as ProjectItemActivityKind,
    actorId: row.actor_id || row.actorId ? String(row.actor_id ?? row.actorId) : null,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    payload: (row.payload as Record<string, unknown>) ?? {},
  };
}

export function toProjectItem(row: Record<string, unknown>, locators: ProjectItemLocator[] = []): ProjectItem {
  const type = String(row.type ?? "general");
  const status = String(row.status ?? "open");
  const priority = String(row.priority ?? "normal");
  const vis = String(row.visibility ?? "client");
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId),
    type: PROJECT_ITEM_TYPES.includes(type as ProjectItemType) ? (type as ProjectItemType) : "general",
    title: String(row.title ?? "Item"),
    description: typeof row.description === "string" ? row.description : null,
    status: PROJECT_ITEM_STATUSES.includes(status as ProjectItemStatus) ? (status as ProjectItemStatus) : "open",
    priority: PROJECT_ITEM_PRIORITIES.includes(priority as ProjectItemPriority) ? (priority as ProjectItemPriority) : "normal",
    assigneeId: row.assignee_id || row.assigneeId ? String(row.assignee_id ?? row.assigneeId) : null,
    dueDate: typeof row.due_date === "string" ? row.due_date : typeof row.dueDate === "string" ? row.dueDate : null,
    createdBy: row.created_by || row.createdBy ? String(row.created_by ?? row.createdBy) : null,
    guestKey: row.guest_key || row.guestKey ? String(row.guest_key ?? row.guestKey) : null,
    visibility: ITEM_VISIBILITY.includes(vis as ItemVisibility) ? (vis as ItemVisibility) : "client",
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    closedAt: typeof row.closed_at === "string" ? row.closed_at : typeof row.closedAt === "string" ? row.closedAt : null,
    locators,
  };
}

export function filterItemList(
  items: ProjectItem[],
  q: { assigneeId?: string | null; status?: ProjectItemStatus | "all"; mine?: boolean; viewerId?: string | null; guestKey?: string | null },
): ProjectItem[] {
  return items.filter((item) => {
    if (q.assigneeId && item.assigneeId !== q.assigneeId) return false;
    if (q.status && q.status !== "all" && item.status !== q.status) return false;
    if (q.mine) {
      const mine = (q.viewerId && item.createdBy === q.viewerId) || (q.guestKey && item.guestKey === q.guestKey);
      if (!mine) return false;
    }
    return true;
  });
}
