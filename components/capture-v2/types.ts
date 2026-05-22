/**
 * Capture V2 UI type contracts — extends canonical Site Walk capture models.
 * Do not duplicate database enums; bind UI fields to existing column names.
 */

export type {
  CaptureAssignee,
  CaptureClassification,
  CaptureItemDraft,
  CaptureItemRecord,
} from "@/lib/types/site-walk-capture";

export {
  CAPTURE_CLASSIFICATIONS,
  CAPTURE_ITEM_STATUSES,
  CAPTURE_PRIORITIES,
  CAPTURE_TAG_SUGGESTIONS,
  CAPTURE_TRADES,
  captureItemToDraft,
} from "@/lib/types/site-walk-capture";

export type { ItemPriority, ItemStatus } from "@/lib/types/site-walk-core";

/** UI phase coordinator — not a persistence FSM. */
export type CaptureV2UiPhase =
  | "hub"
  | "viewfinder"
  | "drawer"
  | "plan"
  | "summary";

/** Alias used when opening log editor from a plan pin peek card. */
export type CaptureV2DrawerPhase = CaptureV2UiPhase | "editingLog";

export function resolveCaptureV2DrawerPhase(phase: CaptureV2DrawerPhase): CaptureV2UiPhase {
  return phase === "editingLog" ? "drawer" : phase;
}

/** Geographic coordinates on site_walk_items (never gps_lat/gps_lng). */
export type CaptureV2GeoCoordinates = {
  latitude: number;
  longitude: number;
};

/** Plan pin percentages on site_walk_pins (never duplicated on items). */
export type CaptureV2PlanPinCoordinates = {
  x_pct: number;
  y_pct: number;
  plan_sheet_id: string;
};

/** Status ring colors for filmstrip thumbnails keyed by item_status. */
export const CAPTURE_V2_STATUS_RING_CLASS: Record<string, string> = {
  open: "ring-red-500",
  in_progress: "ring-amber-400",
  resolved: "ring-emerald-500",
  verified: "ring-emerald-400",
  closed: "ring-slate-500",
  na: "ring-slate-600",
};

/** Smart chip templates for LogEntryDrawer quick classification inserts. */
export const CAPTURE_V2_SMART_CHIPS = [
  "Safety",
  "Progress",
  "Issue",
  "Needs Review",
  "Mechanical",
  "Electrical",
  "Drywall",
] as const;

export type CaptureV2SmartChip = (typeof CAPTURE_V2_SMART_CHIPS)[number];

/** Query params mirrored from legacy capture/page.tsx server loader. */
export type CaptureV2PageQuery = {
  session?: string;
  plan?: string;
  quick?: string;
  launch?: string;
  item?: string;
};
