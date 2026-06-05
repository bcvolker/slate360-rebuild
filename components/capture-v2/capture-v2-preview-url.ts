import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

/** Prefer stable local blob previews before server image URLs. */
export function resolveCaptureV2ThumbUrl(
  item: CaptureItemRecord,
  previewOverride?: string | null,
): string | null {
  if (item.local_preview_url) return item.local_preview_url;
  if (previewOverride?.startsWith("blob:")) return previewOverride;
  if (previewOverride) return previewOverride;
  return getCaptureImageUrl(item);
}

export function resolveCaptureV2PreviewUrl(
  item: CaptureItemRecord | null,
  activePreviewUrl?: string | null,
): string | null {
  if (item?.local_preview_url) return item.local_preview_url;
  if (activePreviewUrl?.startsWith("blob:")) return activePreviewUrl;
  if (activePreviewUrl) return activePreviewUrl;
  if (item) return getCaptureImageUrl(item);
  return null;
}
