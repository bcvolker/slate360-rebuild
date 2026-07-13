/**
 * Shared types for the public deliverable viewer (`/view/[token]`).
 * Items are rendered by `components/site-walk/viewer/ItemRenderers.tsx`.
 */

export type ViewerItemType =
  | "photo"
  | "video"
  | "voice"
  | "note"
  | "photo_360"
  | "tour_360"
  | "model_3d"
  | "thermal"
  | "time_lapse";

export interface ViewerMetadata {
  timestamp?: string;
  gps?: { lat: number; lng: number };
  weather?: string;
  device?: string;
  author?: string;
  /** SW-014: this stop's note was AI-formatted (the verbatim original is preserved). */
  ai_formatted?: boolean;
  /** SW-014: the verbatim original field note, shown under a "view original" disclosure. */
  note_raw?: string;
}

export interface ViewerItem {
  id: string;
  type: ViewerItemType;
  title: string;
  url?: string;
  /** When set, viewer fetches via `/api/view/[token]/media/[mediaItemId]`. */
  mediaItemId?: string;
  notes?: string;
  metadata?: ViewerMetadata;
  markupSvg?: string;
  transcript?: string;
  tourId?: string;
}

export type MetadataVisibility = Partial<Record<keyof ViewerMetadata, boolean>>;

/** A plan sheet the walk's pins can reference — rendered as the plan stage. */
export interface ViewerPlanSheet {
  id: string;
  sheetName: string;
  sheetNumber: number;
  width: number;
  height: number;
  /** Fetched via `/api/view/[token]/plan-sheet/[sheetId]` — token-gated, mirrors
   *  the item media route. Absent (sheet omitted) when not yet rasterized. */
  imageUrl: string;
}

/** A pin placed on a plan sheet during the walk, linking to a captured item. */
export interface ViewerPlanPin {
  id: string;
  planSheetId: string;
  xPct: number;
  yPct: number;
  pinNumber: number | null;
  /** Matches a `ViewerItem.id` in `items` when the pin has a captured stop. */
  itemId: string | null;
}

export interface ViewerDeliverable {
  id: string;
  title: string;
  senderName: string;
  senderLogo?: string;
  shareToken: string;
  items: ViewerItem[];
  metadataVisibility: MetadataVisibility;
  /** Present only when the walk this deliverable came from used a plan. */
  planSheets?: ViewerPlanSheet[];
  planPins?: ViewerPlanPin[];
}

export interface ViewerComment {
  id: string;
  deliverable_id: string;
  item_id: string;
  parent_id?: string | null;
  author_user_id?: string | null;
  author_name: string;
  author_email?: string | null;
  body: string;
  created_at: string;
  is_field?: boolean;
  is_escalation?: boolean;
  comment_intent?: "approve" | "needs_change" | "question" | "comment" | null;
}
