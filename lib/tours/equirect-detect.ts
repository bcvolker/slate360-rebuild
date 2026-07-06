/**
 * Client-side pre-upload 360° photo detection for the mobile import flow.
 * Browser-only (uses createImageBitmap/Blob.text) — no server-only or Node APIs.
 *
 * Aspect ratio (~2:1) is the PRIMARY signal and the only thing that gates
 * `looksLikeEquirect`. GPano XMP presence is CONFIRMING-only: it upgrades the
 * displayed confidence message but never overrides an aspect-based rejection,
 * and its absence never blocks a valid 2:1 photo. This mirrors a real bug class
 * a GPano-first detector would hit — public/uploads/pletchers.jpg is a genuine
 * 8192x4096 (exactly 2:1) equirectangular photo with GPano metadata fully
 * stripped; a GPano-first gate would silently reject it. Verified against real
 * camera-app exports too: 360_Sample_Photos/01_Insta360_X5 and the Ricoh Theta
 * sample carry GPano tags at byte offset ~330 (well inside the 256KB scan
 * window here), while the renderstuff/pletchers fixtures have none at all —
 * both the true-positive and true-negative paths are exercised by real files.
 *
 * This is a UX pre-check only; the upload API (validateSceneFileMeta) is the
 * authoritative gate and re-checks the same aspect band server-side.
 */

import { hasRejectedRawExtension, isEquirectAspectRatio } from "@/lib/tours/upload-constraints";

export type EquirectDetection = {
  width: number;
  height: number;
  aspectRatio: number;
  /** Primary signal: aspect ratio falls in the accepted ~2:1 band. */
  looksLikeEquirect: boolean;
  /** Confirming-only: never gates `looksLikeEquirect`, only affects the message. */
  hasGPanoMetadata: boolean;
  isRejectedRawFormat: boolean;
  summary: string;
};

// GPano/XMP packets sit in the JPEG's early APP1 segments (verified at byte
// offset ~330 in real Insta360/Ricoh/test-chart exports) — 256KB is a large
// margin, not a tight fit.
const GPANO_SCAN_BYTES = 256 * 1024;
const GPANO_MARKERS = ["ns.google.com/photos/1.0/panorama", "GPano:"];

export async function detectEquirect(file: Blob, filename: string): Promise<EquirectDetection> {
  const isRejectedRawFormat = hasRejectedRawExtension(filename);

  let width = 0;
  let height = 0;
  if (!isRejectedRawFormat) {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // Not a decodable image — width/height stay 0, which fails the aspect
      // check below and surfaces as "couldn't read this image".
    }
  }

  const aspectRatio = height > 0 ? width / height : 0;
  const looksLikeEquirect = !isRejectedRawFormat && width > 0 && isEquirectAspectRatio(width, height);

  let hasGPanoMetadata = false;
  if (!isRejectedRawFormat && width > 0) {
    try {
      const head = await file.slice(0, GPANO_SCAN_BYTES).text();
      hasGPanoMetadata = GPANO_MARKERS.some((marker) => head.includes(marker));
    } catch {
      hasGPanoMetadata = false;
    }
  }

  const summary = isRejectedRawFormat
    ? "Raw camera file — export a finished 360° photo from your camera's app first."
    : width === 0
      ? "Couldn't read this image."
      : looksLikeEquirect
        ? hasGPanoMetadata
          ? `Verified 360° photo (${width}×${height}, GPano metadata present).`
          : `Looks like a 360° photo (${width}×${height}, ~2:1).`
        : `Doesn't look like a 360° photo — expected roughly 2:1, got ${width}×${height} (${aspectRatio.toFixed(2)}:1).`;

  return { width, height, aspectRatio, looksLikeEquirect, hasGPanoMetadata, isRejectedRawFormat, summary };
}
