import type { VnextClientDocument, VnextDocumentFolder, VnextSearchHit } from "./documents/document-types";
import { buildProjectSearchHits } from "./documents/project-search";
import { vnextExploreHref } from "./explore/build-explore-href";
import type { VnextProjectPlanSet } from "./plans/plan-types";

const BASE = "/preview/vnext/project";

export const PREVIEW_DOCUMENTS_BASE = `${BASE}/documents`;
export const PREVIEW_ITEMS_BASE = `${BASE}/items`;
export const PREVIEW_EXPLORE_BASE = `${BASE}/explore`;

const drawing: VnextClientDocument = {
  id: "doc-ceiling",
  displayName: "Level 2 reflected ceiling",
  filename: "Level-2-reflected-ceiling.pdf",
  typeLabel: "PDF",
  extension: "pdf",
  sizeLabel: "2.4 MB",
  dateLabel: "Sep 18, 2026",
  folderId: "folder-drawings",
  folderLabel: "Drawings",
  canOpen: true,
  canDownload: true,
  openHref: "/mock/sitewalk.jpg",
  downloadHref: "/mock/sitewalk.jpg",
  previewHref: null,
  related: { title: "Water stain at east corridor", href: `${PREVIEW_ITEMS_BASE}/item-plan` },
  sheetsHref: "/preview/vnext/project/documents-plans#plan-arch",
};

const photo: VnextClientDocument = {
  id: "doc-photo",
  displayName: "East corridor condition",
  filename: "east-corridor.jpg",
  typeLabel: "Image",
  extension: "jpg",
  sizeLabel: "640 KB",
  dateLabel: "Sep 18, 2026",
  folderId: "folder-reports",
  folderLabel: "Reports",
  canOpen: true,
  canDownload: true,
  openHref: "/mock/sitewalk.jpg",
  downloadHref: "/mock/sitewalk.jpg",
  previewHref: "/mock/sitewalk.jpg",
  related: null,
};

const schedule: VnextClientDocument = {
  id: "doc-schedule",
  displayName: "Equipment schedule",
  filename: "equipment-schedule.xlsx",
  typeLabel: "Spreadsheet",
  extension: "xlsx",
  sizeLabel: "180 KB",
  dateLabel: "Sep 15, 2026",
  folderId: "folder-reports",
  folderLabel: "Reports",
  canOpen: false,
  canDownload: true,
  openHref: null,
  downloadHref: "/mock/sitewalk.jpg",
  previewHref: null,
  related: null,
};

export const PREVIEW_DOCUMENTS: VnextClientDocument[] = [drawing, photo, schedule];

export const PREVIEW_DOCUMENT_FOLDERS: VnextDocumentFolder[] = [
  { id: "folder-drawings", label: "Drawings" },
  { id: "folder-reports", label: "Reports" },
];

export const PREVIEW_DOCUMENT_HITS: VnextSearchHit[] = buildProjectSearchHits({
  projectId: "11111111-1111-4111-8111-111111111111",
  documentsBase: PREVIEW_DOCUMENTS_BASE,
  itemsBase: PREVIEW_ITEMS_BASE,
  exploreBase: PREVIEW_EXPLORE_BASE,
  documents: PREVIEW_DOCUMENTS,
  items: [
    {
      id: "item-plan",
      title: "Water stain at east corridor",
      description: "Stain on the corridor ceiling.",
      locationLabel: "Level 2 – East Corridor",
      trade: "Mechanical",
      category: null,
      tags: ["ceiling"],
      dateLabel: "Sep 18, 2026",
    },
  ],
  plans: [
    {
      id: "sheet-1",
      label: "A2.12 Level 2 reflected ceiling",
      sheetNumber: "12",
      dateLabel: "Sep 1, 2026",
    },
  ],
});

export const PREVIEW_PLAN_SETS: VnextProjectPlanSet[] = [
  {
    id: "plan-arch",
    title: "Construction Drawings",
    revisionLabel: "Rev 2",
    source: {
      documentId: "doc-ceiling",
      title: "Level 2 reflected ceiling",
      href: `${PREVIEW_DOCUMENTS_BASE}/doc-ceiling`,
    },
    sheets: [
      {
        id: "sheet-a101",
        label: "A1.01 Site plan",
        exploreHref: vnextExploreHref(PREVIEW_EXPLORE_BASE, { rep: "plan", source: "sheet-a101" }),
        statusLabel: null,
      },
      {
        id: "sheet-wait",
        label: "A2.01 Floor plan",
        exploreHref: null,
        statusLabel: "Processing",
      },
    ],
  },
];

export function previewDocument(id: string): VnextClientDocument | null {
  return PREVIEW_DOCUMENTS.find((document) => document.id === id) ?? null;
}
