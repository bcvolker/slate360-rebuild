/**
 * Shared upload constraints for tour scene panoramas — isomorphic (no server-only
 * or browser-only deps) so both server validation routes and the client-side
 * pre-upload equirect-detect check stay in sync instead of drifting.
 */

// Raw camera formats we don't ingest yet (Tier 1 = finished equirect exports only).
// .insp/.insv are Insta360 raw photo/video; .360 is GoPro/Insta360 raw; .dng is
// drone raw stills (e.g. some DJI panorama workflows).
export const REJECTED_RAW_EXTENSIONS = [".insp", ".insv", ".360", ".dng"] as const;

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

// Equirectangular panoramas are ~2:1. ±15% tolerance around the ideal ratio.
export const EQUIRECT_ASPECT_MIN = 1.7;
export const EQUIRECT_ASPECT_MAX = 2.3;

export function hasRejectedRawExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return REJECTED_RAW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isAcceptedMimeType(contentType: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(contentType);
}

export function isEquirectAspectRatio(width: number, height: number): boolean {
  if (height <= 0) return false;
  const ratio = width / height;
  return ratio >= EQUIRECT_ASPECT_MIN && ratio <= EQUIRECT_ASPECT_MAX;
}

export const RAW_FORMAT_REJECTION_MESSAGE =
  "Raw camera files are not supported. Please export your panorama to a finished JPEG (equirectangular format) using your camera's desktop or mobile app first.";

export const MIME_REJECTION_MESSAGE =
  "Only JPEG and PNG files are accepted. Please export your panorama as a JPEG or PNG before uploading.";

export function aspectRejectionMessage(width: number, height: number): string {
  const ratio = height > 0 ? width / height : 0;
  return (
    "This image does not appear to be an equirectangular 360° panorama. " +
    "Please upload an image with an approximate 2:1 aspect ratio (e.g. 5760×2880). " +
    `Received: ${width}×${height} (ratio ${ratio.toFixed(2)}:1).`
  );
}
