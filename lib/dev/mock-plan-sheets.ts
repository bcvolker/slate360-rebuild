import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

export const DEV_PLAN_SET_ID = "dev-plan-set-001";
export const DEV_PLAN_PROJECT_ID = "dev-project-plan";

function planThumb(label: string, tone: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="168" viewBox="0 0 240 168"><rect width="240" height="168" fill="${tone}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="18">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildMockSheet(args: {
  id: string;
  sheetNumber: number;
  sortOrder: number;
  name: string;
  tone: string;
  crop?: { x: number; y: number; w: number; h: number };
}): SiteWalkPlanSheet {
  return {
    id: args.id,
    org_id: "dev-org",
    project_id: DEV_PLAN_PROJECT_ID,
    plan_set_id: DEV_PLAN_SET_ID,
    sheet_number: args.sheetNumber,
    sheet_name: args.name,
    image_s3_key: null,
    thumbnail_s3_key: null,
    tile_manifest: {},
    width: 2400,
    height: 1680,
    rotation: 0,
    scale_label: null,
    sort_order: args.sortOrder,
    metadata: args.crop ? { crop_bbox_pct: args.crop } : {},
    created_at: "2026-06-09T12:00:00.000Z",
    updated_at: "2026-06-09T12:00:00.000Z",
    rasterized_key: `dev/mock/${args.id}.webp`,
    rasterized_width: 2400,
    rasterized_height: 1680,
  };
}

export const DEV_MOCK_PLAN_SET: SiteWalkPlanSet = {
  id: DEV_PLAN_SET_ID,
  org_id: "dev-org",
  project_id: DEV_PLAN_PROJECT_ID,
  title: "A-101 Drawing Set",
  description: null,
  source_file_id: null,
  source_unified_file_id: null,
  source_s3_key: null,
  original_file_name: "A-101.pdf",
  mime_type: "application/pdf",
  file_size: 0,
  page_count: 12,
  processing_status: "ready",
  processing_error: null,
  uploaded_by: null,
  metadata: {},
  created_at: "2026-06-09T12:00:00.000Z",
  updated_at: "2026-06-09T12:00:00.000Z",
};

const SHEET_NAMES = [
  "Cover",
  "Site Plan",
  "Level 1",
  "Level 2",
  "Level 3",
  "Roof",
  "Sections A",
  "Sections B",
  "Details 1",
  "Details 2",
  "Schedules",
  "Legend",
];

const SHEET_TONES = [
  "#1e293b",
  "#334155",
  "#0f766e",
  "#155e75",
  "#1d4ed8",
  "#7c3aed",
  "#9a3412",
  "#92400e",
  "#3f6212",
  "#166534",
  "#475569",
  "#64748b",
];

export const DEV_MOCK_PLAN_SHEETS: SiteWalkPlanSheet[] = SHEET_NAMES.map((name, index) =>
  buildMockSheet({
    id: `dev-plan-sheet-${index + 1}`,
    sheetNumber: index + 1,
    sortOrder: index,
    name,
    tone: SHEET_TONES[index] ?? "#334155",
    crop: index === 2 ? { x: 8, y: 12, w: 72, h: 58 } : undefined,
  }),
);

export const DEV_MOCK_PLAN_SHEET_IMAGE_URLS = Object.fromEntries(
  DEV_MOCK_PLAN_SHEETS.map((sheet, index) => [
    sheet.id,
    planThumb(String(index + 1), SHEET_TONES[index] ?? "#334155"),
  ]),
);
