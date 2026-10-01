import { formatPlainDate } from "@/lib/vnext/overview-visit";
import { bestSpatialAction, deriveItemLocators, type LocatorPinEvidence } from "./derive-locators";
import {
  IMAGE_ITEM_TYPES,
  clientPriorityLabel,
  itemStatusLabel,
  itemStatusTone,
  itemTypeLabel,
} from "./item-language";
import type { VnextClientItem } from "./item-types";

export type ItemSourceRow = {
  id: string;
  title: string | null;
  description: string | null;
  item_type: string;
  item_status: string | null;
  priority: string | null;
  trade: string | null;
  category: string | null;
  tags: string[] | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  session_id: string | null;
  s3_key: string | null;
  before_item_id: string | null;
  project_id: string | null;
};

export type AssembleItemContext = {
  projectId: string;
  pins: LocatorPinEvidence[];
  renderableSheetIds: ReadonlySet<string>;
  publishedPanoramaIds?: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
  commentCount: number;
  relatedTitle: string | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function assembleClientItem(row: ItemSourceRow, context: AssembleItemContext): VnextClientItem {
  const hasRenderableImage = IMAGE_ITEM_TYPES.has(row.item_type) && Boolean(row.s3_key);
  const capturedAt = row.captured_at ?? "";
  const locators = deriveItemLocators({
    itemId: row.id,
    projectId: context.projectId,
    itemType: row.item_type,
    hasRenderableImage,
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: clean(row.location_label),
    sessionId: row.session_id,
    sessionInProject: Boolean(row.session_id && context.sessionIds.has(row.session_id)),
    capturedAt: capturedAt || null,
    pins: context.pins,
    renderableSheetIds: context.renderableSheetIds,
    publishedPanoramaIds: context.publishedPanoramaIds,
  });
  const title = clean(row.title) ?? "Untitled item";
  const tags = (row.tags ?? []).map((tag) => tag.trim()).filter(Boolean);

  return {
    id: row.id,
    title,
    description: clean(row.description),
    typeLabel: itemTypeLabel(row.item_type),
    status: (row.item_status ?? "").trim(),
    statusLabel: itemStatusLabel(row.item_status),
    statusTone: itemStatusTone(row.item_status),
    priorityLabel: clientPriorityLabel(row.priority),
    trade: clean(row.trade),
    category: clean(row.category),
    tags,
    documentedAt: capturedAt,
    dateLabel: formatPlainDate(capturedAt) ?? "",
    locationLabel: clean(row.location_label),
    thumbnailUrl: hasRenderableImage
      ? `/api/vnext/projects/${context.projectId}/items/${row.id}/image`
      : null,
    questionCount: context.commentCount,
    locators,
    spatialAction: bestSpatialAction(locators),
    relatedItemId: row.before_item_id,
    relatedTitle: row.before_item_id ? context.relatedTitle : null,
  };
}
