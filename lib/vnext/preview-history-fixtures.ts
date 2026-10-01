import type { VnextVisit } from "./history/history-types";
import { vnextExploreHref } from "./explore/build-explore-href";

const EXPLORE = "/preview/vnext/project/explore";
const ITEMS = "/preview/vnext/project/items";
const PHOTO = "/mock/sitewalk.jpg";

function visit(partial: VnextVisit): VnextVisit {
  return partial;
}

export const PREVIEW_HISTORY_BASE = "/preview/vnext/project/history";

export const PREVIEW_VISITS: VnextVisit[] = [
  visit({
    id: "session-sep18",
    occurredAt: "2026-09-18T15:00:00.000Z",
    dateLabel: "Sep 18, 2026",
    title: "Level 2 walk",
    kind: "site",
    kindLabel: "Site documentation",
    sources: [
      {
        rep: "360",
        label: "East corridor",
        sourceId: "pano-1",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "360", source: "pano-1" }),
        imageHref: PHOTO,
      },
      {
        rep: "plan",
        label: "A2.12 Level 2",
        sourceId: "sheet-a212",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "plan", source: "sheet-a212" }),
        imageHref: PHOTO,
      },
    ],
    plans: [
      {
        sheetId: "sheet-a212",
        sheetLabel: "A2.12 Level 2",
        revisionLabel: "Rev 2",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "plan", source: "sheet-a212" }),
        imageHref: PHOTO,
      },
    ],
    items: [{ id: "item-plan", title: "Water stain at east corridor", href: `${ITEMS}/item-plan` }],
    itemCount: 1,
    thumbnailHref: PHOTO,
    frame: null,
  }),
  visit({
    id: "capture-sep15",
    occurredAt: "2026-09-15T12:00:00.000Z",
    dateLabel: "Sep 15, 2026",
    title: "Reality scan",
    kind: "reality",
    kindLabel: "Reality scan",
    sources: [
      {
        rep: "reality",
        label: "Reality scan",
        sourceId: "model-b",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "reality", source: "model-b" }),
        imageHref: PHOTO,
      },
    ],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: PHOTO,
    frame: { spaceId: "space-1", modelId: "model-b", georeferenceStatus: "VERIFIED" },
  }),
  visit({
    id: "capture-sep1",
    occurredAt: "2026-09-01T12:00:00.000Z",
    dateLabel: "Sep 1, 2026",
    title: "Reality scan",
    kind: "reality",
    kindLabel: "Reality scan",
    sources: [
      {
        rep: "reality",
        label: "Reality scan",
        sourceId: "model-a",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "reality", source: "model-a" }),
        imageHref: PHOTO,
      },
    ],
    plans: [
      {
        sheetId: "sheet-a212",
        sheetLabel: "A2.12 Level 2",
        revisionLabel: "Rev 2",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "plan", source: "sheet-a212" }),
        imageHref: PHOTO,
      },
    ],
    items: [],
    itemCount: 0,
    thumbnailHref: PHOTO,
    frame: { spaceId: "space-1", modelId: "model-a", georeferenceStatus: "VERIFIED" },
  }),
  visit({
    id: "session-aug",
    occurredAt: "2026-08-02T15:00:00.000Z",
    dateLabel: "Aug 2, 2026",
    title: "Entry walk",
    kind: "site",
    kindLabel: "Site documentation",
    sources: [
      {
        rep: "360",
        label: "Entry",
        sourceId: "pano-aug",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "360", source: "pano-aug" }),
        imageHref: PHOTO,
      },
    ],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: PHOTO,
    frame: null,
  }),
  visit({
    id: "thermal-aug",
    occurredAt: "2026-08-02T18:00:00.000Z",
    dateLabel: "Aug 2, 2026",
    title: "Entry scan",
    kind: "thermal",
    kindLabel: "Thermal scan",
    sources: [
      {
        rep: "thermal",
        label: "Entry scan",
        sourceId: "thermal-aug",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "thermal", source: "thermal-aug" }),
        imageHref: PHOTO,
      },
    ],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: PHOTO,
    frame: null,
  }),
  visit({
    id: "thermal-sep18",
    occurredAt: "2026-09-18T18:00:00.000Z",
    dateLabel: "Sep 18, 2026",
    title: "Ceiling scan",
    kind: "thermal",
    kindLabel: "Thermal scan",
    sources: [
      {
        rep: "thermal",
        label: "Ceiling scan",
        sourceId: "thermal-1",
        exploreHref: vnextExploreHref(EXPLORE, { rep: "thermal", source: "thermal-1" }),
        imageHref: PHOTO,
      },
    ],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: null,
    frame: null,
  }),
];

export const PREVIEW_UNALIGNED_LATER: VnextVisit = {
  ...PREVIEW_VISITS[1],
  id: "capture-sep15-open",
  frame: { spaceId: "space-2", modelId: "model-c", georeferenceStatus: null },
};

export function previewVisit(id: string): VnextVisit | null {
  return PREVIEW_VISITS.find((visit) => visit.id === id) ?? (id === PREVIEW_UNALIGNED_LATER.id ? PREVIEW_UNALIGNED_LATER : null);
}
