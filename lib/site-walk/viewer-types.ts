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
}

export interface ViewerItem {
  id: string;
  type: ViewerItemType;
  title: string;
  url?: string;
  notes?: string;
  metadata?: ViewerMetadata;
  markupSvg?: string;
  transcript?: string;
  tourId?: string;
}

export type MetadataVisibility = Partial<Record<keyof ViewerMetadata, boolean>>;

export interface ViewerDeliverable {
  id: string;
  title: string;
  senderName: string;
  senderLogo?: string;
  shareToken: string;
  items: ViewerItem[];
  metadataVisibility: MetadataVisibility;
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
}
