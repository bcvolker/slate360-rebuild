import type { VnextNavItem } from "./nav";
import type { VnextProjectOverview } from "./overview-types";

const REALITY = "/vnext-preview/reality.svg";

const BASE_ID = "11111111-1111-4111-8111-111111111111";
const SPARSE_ID = "44444444-4444-4444-8444-444444444444";

export const PREVIEW_OVERVIEW_PROJECT: VnextProjectOverview = {
  id: BASE_ID,
  name: "Harbor Street Residence",
  context: "Northwater Construction",
  locationLabel: "Portland, ME",
  hero: { kind: "reality", url: REALITY },
  documentedLabel: "Last documented Sep 14, 2026",
  latestVisit: {
    occurredAt: "2026-09-14T15:00:00.000Z",
    sourceLabel: "Site visit",
    dateLabel: "Sep 14, 2026",
  },
  representations: ["reality", "geometry", "plan"],
  recentItems: [
    {
      id: "item-1",
      title: "Confirm framing at east stair",
      statusLabel: "Open",
      updatedAt: "2026-09-13T12:00:00.000Z",
      dateLabel: "Sep 13, 2026",
    },
    {
      id: "item-2",
      title: "Verify insulation depth in attic",
      statusLabel: "In Progress",
      updatedAt: "2026-09-10T12:00:00.000Z",
      dateLabel: "Sep 10, 2026",
    },
    {
      id: "item-3",
      title: "Photograph completed foundation pour",
      statusLabel: "Resolved",
      updatedAt: "2026-08-28T12:00:00.000Z",
      dateLabel: "Aug 28, 2026",
    },
  ],
  recentDocuments: [
    { id: "doc-1", name: "Structural-Plan-Rev4.pdf", uploadedAt: "2026-09-12T12:00:00.000Z", dateLabel: "Sep 12, 2026" },
    { id: "doc-2", name: "Site-Photos-Sept.zip", uploadedAt: "2026-09-05T12:00:00.000Z", dateLabel: "Sep 5, 2026" },
  ],
  exploreHref: "/preview/vnext/project/explore",
  itemsHref: "/preview/vnext/project/items",
  documentsHref: "/preview/vnext/project/documents",
  historyHref: "/preview/vnext/project/history",
};

export const PREVIEW_OVERVIEW_SPARSE: VnextProjectOverview = {
  id: SPARSE_ID,
  name: "West Yard Adaptive Reuse — Phase Two Interior Documentation and Structural Assessment",
  context: null,
  locationLabel: null,
  hero: { kind: "neutral", url: null },
  documentedLabel: null,
  latestVisit: null,
  representations: [],
  recentItems: [],
  recentDocuments: [],
  exploreHref: "/preview/vnext/project-sparse/explore",
  itemsHref: "/preview/vnext/project-sparse/items",
  documentsHref: "/preview/vnext/project-sparse/documents",
  historyHref: "/preview/vnext/project-sparse/history",
};

export const PREVIEW_OVERVIEW_NAV_PATH = `/vnext/projects/${BASE_ID}`;
export const PREVIEW_OVERVIEW_SPARSE_NAV_PATH = `/vnext/projects/${SPARSE_ID}`;

const PREVIEW_PROJECT_ROOT = "/preview/vnext/project";

export const PREVIEW_PROJECT_NAV_ITEMS: readonly VnextNavItem[] = [
  { href: PREVIEW_PROJECT_ROOT, label: "Overview", exact: true },
  { href: `${PREVIEW_PROJECT_ROOT}/explore`, label: "Explore" },
  { href: `${PREVIEW_PROJECT_ROOT}/items`, label: "Items" },
  { href: `${PREVIEW_PROJECT_ROOT}/documents`, label: "Documents" },
  { href: `${PREVIEW_PROJECT_ROOT}/history`, label: "History" },
] as const;
