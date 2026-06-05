import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

/** Prefer stable local blob previews before server image URLs. */
export function resolveCaptureV2ThumbUrl(
  item: CaptureItemRecord,
  previewOverride?: string | null,
): string | null {
  if (previewOverride?.startsWith("blob:")) return previewOverride;
  if (item.local_preview_url) return item.local_preview_url;
  if (previewOverride) return previewOverride;
  return getCaptureImageUrl(item);
}

export function resolveCaptureV2PreviewUrl(
  item: CaptureItemRecord | null,
  activePreviewUrl?: string | null,
): string | null {
  if (activePreviewUrl?.startsWith("blob:")) return activePreviewUrl;
  if (item?.local_preview_url) return item.local_preview_url;
  if (activePreviewUrl) return activePreviewUrl;
  if (item) return getCaptureImageUrl(item);
  return null;
}

export function preloadCaptureV2Image(url: string): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (url.startsWith("blob:")) return Promise.resolve(true);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
