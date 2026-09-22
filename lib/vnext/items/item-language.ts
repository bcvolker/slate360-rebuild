import type { VnextClientItem, VnextItemStatusTone } from "./item-types";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  na: "Not applicable",
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo",
  photo_360: "360 photo",
  video: "Video",
  text_note: "Note",
  voice_note: "Voice note",
  annotation: "Annotation",
  file_attachment: "File",
};

const OPEN_STATUSES = new Set(["open", "in_progress"]);
const CLOSED_STATUSES = new Set(["resolved", "verified", "closed"]);

export type ItemStatusFilter = "all" | "open" | "closed";

export function itemStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "").trim();
  if (!raw) return "Status unknown";
  return STATUS_LABELS[raw] ?? raw.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function itemStatusTone(status: string | null | undefined): VnextItemStatusTone {
  const raw = (status ?? "").trim();
  if (OPEN_STATUSES.has(raw)) return "attention";
  if (CLOSED_STATUSES.has(raw)) return "done";
  return "neutral";
}

export function itemTypeLabel(itemType: string | null | undefined): string {
  const raw = (itemType ?? "").trim();
  return TYPE_LABELS[raw] ?? "Record";
}

/** Only priorities a client would act on. Medium/low are the ordinary default and stay off the page. */
export function clientPriorityLabel(priority: string | null | undefined): string | null {
  if (priority === "high") return "High";
  if (priority === "critical") return "Critical";
  return null;
}

export function statusMatchesFilter(status: string, filter: ItemStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return OPEN_STATUSES.has(status);
  return CLOSED_STATUSES.has(status);
}

export function itemSearchText(item: Pick<
  VnextClientItem,
  "title" | "description" | "locationLabel" | "trade" | "category" | "tags"
>): string {
  return [item.title, item.description, item.locationLabel, item.trade, item.category, ...item.tags]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase();
}

export function itemMatchesQuery(item: VnextClientItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

export const IMAGE_ITEM_TYPES = new Set(["photo", "photo_360"]);

export const ITEMS_EMPTY_COPY = "No project items have been published yet.";
export const ITEMS_FILTER_EMPTY_COPY = "No items match this search.";
export const ITEMS_LOAD_ERROR = "Items could not be loaded. Check your connection and try again.";
export const QUESTION_SEND_ERROR = "The question could not be sent. Try again.";
