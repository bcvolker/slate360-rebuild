import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureTypeId } from "./types";

const METADATA_KIND_MAP: Record<string, CaptureTypeId> = {
  photo_360: "photo_360",
  file_attachment: "file_attachment",
};

/** Resolve registry type id from a stored capture item row. */
export function resolveCaptureTypeId(item: CaptureItemRecord): CaptureTypeId {
  const kind =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>).kind
      : undefined;
  if (typeof kind === "string" && kind in METADATA_KIND_MAP) {
    return METADATA_KIND_MAP[kind];
  }
  return item.item_type;
}
