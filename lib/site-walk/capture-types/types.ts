import type { ComponentType } from "react";
import type { SiteWalkItemType } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

/** DB item types plus forward-compatible extensions not yet in SITE_WALK_ITEM_TYPES. */
export type CaptureTypeExtension = "photo_360" | "file_attachment";

export type CaptureTypeId = SiteWalkItemType | CaptureTypeExtension;

export type CapturePersistContext = {
  sessionId: string;
  projectId: string | null;
  locationLabel: string;
  planPinId?: string | null;
};

export type CapturePersistResult = {
  item: CaptureItemRecord;
};

export type CapturePersistInput<TMeta = Record<string, unknown>> =
  | { mode: "create"; meta: TMeta; blob?: Blob | File }
  | { mode: "update"; itemId: string; meta: Partial<TMeta>; blob?: Blob | File };

export type CaptureThumbnailProps = {
  item: CaptureItemRecord;
  selected: boolean;
  stopNumber: number;
  imageUrlOverride?: string | null;
  onSelect?: () => void;
};

export type CaptureViewfinderProps = {
  item: CaptureItemRecord | null;
  onCommitted: (item: CaptureItemRecord) => void;
  onCancel: () => void;
};

export interface CaptureTypePlugin<TMeta = Record<string, unknown>> {
  id: CaptureTypeId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  Thumbnail: ComponentType<CaptureThumbnailProps>;
  Viewfinder?: ComponentType<CaptureViewfinderProps>;
  persist: (
    input: CapturePersistInput<TMeta>,
    ctx: CapturePersistContext,
  ) => Promise<CapturePersistResult>;
  hydrateMeta: (item: CaptureItemRecord) => TMeta;
  sourcePicker?: { group: "media" | "note" | "file"; order: number };
}
