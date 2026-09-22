import { assembleClientItem, type AssembleItemContext, type ItemSourceRow } from "./items/assemble-items";
import { buildExploreItemFocus } from "./items/derive-locators";
import type { VnextClientItem, VnextExploreItemFocus, VnextItemQuestion } from "./items/item-types";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const SHEETS = new Set(["sheet-1"]);
const SESSIONS = new Set(["session-1"]);

function previewItem(
  row: ItemSourceRow,
  extra: Partial<AssembleItemContext> = {},
  thumbnail: string | null = null,
): VnextClientItem {
  const item = assembleClientItem(row, {
    projectId: PROJECT_ID,
    pins: [],
    renderableSheetIds: SHEETS,
    sessionIds: SESSIONS,
    commentCount: 0,
    relatedTitle: null,
    ...extra,
  });
  return { ...item, thumbnailUrl: thumbnail };
}

const shared = {
  project_id: PROJECT_ID,
  session_id: "session-1",
  priority: "medium",
  trade: null,
  category: null,
  tags: [] as string[],
  latitude: null,
  longitude: null,
  before_item_id: null,
  description: null,
};

export const PREVIEW_ITEM_PLAN = previewItem(
  {
    ...shared,
    id: "item-plan",
    title: "Water stain at east corridor",
    description: "Stain on the corridor ceiling, about two feet from the mechanical shaft.",
    item_type: "photo",
    item_status: "open",
    priority: "high",
    trade: "Mechanical",
    tags: ["ceiling", "stain"],
    location_label: "Level 2 – East Corridor",
    latitude: 45.5152,
    longitude: -122.6784,
    captured_at: "2026-09-18T15:00:00.000Z",
    s3_key: "preview/stain.jpg",
    before_item_id: "item-closed",
  },
  {
    commentCount: 2,
    relatedTitle: "Foundation waterproofing",
    pins: [
      { itemId: "item-plan", projectId: PROJECT_ID, planSheetId: "sheet-1", xPct: 62, yPct: 38 },
      { itemId: "other-item", projectId: PROJECT_ID, planSheetId: "sheet-1", xPct: 10, yPct: 10 },
      { itemId: "item-plan", projectId: "other-project", planSheetId: "sheet-9", xPct: 4, yPct: 4 },
    ],
  },
  "/mock/sitewalk.jpg",
);

export const PREVIEW_ITEM_NOTE = previewItem({
  ...shared,
  id: "item-note",
  title: "Roof drain still holding water",
  description: "Standing water at the north drain after the rain.",
  item_type: "text_note",
  item_status: "in_progress",
  trade: "Plumbing",
  location_label: "Roof",
  captured_at: "2026-09-12T15:00:00.000Z",
  s3_key: null,
});

export const PREVIEW_ITEM_CLOSED = previewItem(
  {
    ...shared,
    id: "item-closed",
    title: "Foundation waterproofing",
    item_type: "photo",
    item_status: "resolved",
    location_label: "Foundation",
    captured_at: "2026-08-28T15:00:00.000Z",
    s3_key: "preview/foundation.jpg",
  },
  {},
  "/vnext-preview/plan.svg",
);

export const PREVIEW_ITEM_PANO = previewItem(
  {
    ...shared,
    id: "pano-1",
    title: "East stair",
    item_type: "photo_360",
    item_status: "open",
    location_label: "East stair",
    captured_at: "2026-09-14T15:00:00.000Z",
    s3_key: "preview/stair.jpg",
  },
  {},
  "/vnext-preview/pano360.png",
);

export const PREVIEW_ITEMS: VnextClientItem[] = [
  PREVIEW_ITEM_PLAN,
  PREVIEW_ITEM_PANO,
  PREVIEW_ITEM_NOTE,
  PREVIEW_ITEM_CLOSED,
];

export const PREVIEW_ITEMS_BASE = "/preview/vnext/project/items";
export const PREVIEW_EXPLORE_BASE = "/preview/vnext/project/explore";

export const PREVIEW_ITEM_QUESTIONS: Record<string, VnextItemQuestion[]> = {
  "item-plan": [
    {
      id: "q-1",
      body: "Is this an active leak, or a stain from the earlier roof work?",
      createdAt: "2026-09-18T18:00:00.000Z",
      dateLabel: "Sep 18, 2026",
      authorLabel: "Northwater Construction",
    },
    {
      id: "q-2",
      body: "Stain only. The shaft above was dry when we checked it.",
      createdAt: "2026-09-19T15:00:00.000Z",
      dateLabel: "Sep 19, 2026",
      authorLabel: "Project team",
    },
  ],
};

export function previewQuestions(itemId: string): VnextItemQuestion[] {
  return PREVIEW_ITEM_QUESTIONS[itemId] ?? [];
}

export function resolvePreviewItemFocus(
  itemId: string | null,
  activeRepresentation: string | null,
  activeSourceId: string | null,
): VnextExploreItemFocus | null {
  if (!itemId) return null;
  const item = PREVIEW_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return null;
  return buildExploreItemFocus({
    itemId: item.id,
    title: item.title,
    statusLabel: item.statusLabel,
    locationLabel: item.locationLabel,
    dateLabel: item.dateLabel,
    detailHref: `${PREVIEW_ITEMS_BASE}/${item.id}`,
    locators: item.locators,
    activeRepresentation,
    activeSourceId,
  });
}
