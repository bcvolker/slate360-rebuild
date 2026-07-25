/**
 * P0b — equirectangular (360) detection by stream aspect ratio.
 *
 * Replaces the filename heuristic (`name.includes("360")`), which silently mis-ingested
 * most real 360 files: Insta360 exports are named e.g. `VID_20260708_120000_00_001.mp4`
 * with no "360" anywhere, so they were classified as ordinary phone video and fed to
 * COLMAP as flat pinhole frames — the documented "360 produces garbage" failure.
 *
 * Detection order (strongest signal first):
 *   1. Measured stream aspect ratio ≈ 2:1  ← authoritative
 *   2. Filename hint                        ← fallback only, for sync call sites
 *
 * GPano XMP is deliberately NOT required: Insta360 Studio frequently strips it on export,
 * so its absence proves nothing. When present it is corroborating evidence only.
 *
 * Browser-only — uses Image/HTMLVideoElement. Callers on the server should classify from
 * ffprobe output instead.
 */

export type Twin360Hint = "equirect" | "flat" | "unknown";

/**
 * Equirectangular projection is 2:1 by definition. The window is deliberately tight so
 * common flat aspect ratios cannot false-positive: 16:9 = 1.78, 3:2 = 1.50, 4:3 = 1.33,
 * anamorphic cinema = 2.39. Real 360 files sit at exactly 2.000 (e.g. Insta360 X4 8K =
 * 7680x3840), so a ±2.5% window is generous.
 */
const EQUIRECT_RATIO_MIN = 1.95;
const EQUIRECT_RATIO_MAX = 2.05;

/** Give up rather than block the UI if a file will not decode. */
const PROBE_TIMEOUT_MS = 5000;

export function ratioToHint(width: number, height: number): Twin360Hint {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "unknown";
  }
  const ratio = width / height;
  return ratio >= EQUIRECT_RATIO_MIN && ratio <= EQUIRECT_RATIO_MAX ? "equirect" : "flat";
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function probeImage(url: string): Promise<Twin360Hint> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(ratioToHint(img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve("unknown");
    img.src = url;
  });
}

function probeVideo(url: string): Promise<Twin360Hint> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => resolve(ratioToHint(video.videoWidth, video.videoHeight));
    video.onerror = () => resolve("unknown");
    video.src = url;
  });
}

/**
 * Measure a file's stream dimensions and report whether it is equirectangular.
 * Never throws and never rejects — returns "unknown" so callers fall back to the
 * filename heuristic rather than failing the upload.
 */
export async function probeEquirectHint(file: File): Promise<Twin360Hint> {
  if (typeof window === "undefined") return "unknown";

  const isVideo = file.type.startsWith("video/") || /\.(webm|mp4|mov|m4v|insv)$/i.test(file.name);
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|heif|insp)$/i.test(file.name);
  if (!isVideo && !isImage) return "unknown";

  // Insta360 raw containers cannot be decoded by the browser; treat as equirect since
  // .insv/.insp only ever come from a 360 camera.
  if (/\.(insv|insp)$/i.test(file.name)) return "equirect";

  const url = URL.createObjectURL(file);
  try {
    return await withTimeout(isVideo ? probeVideo(url) : probeImage(url), "unknown");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Probe many files concurrently, returning a hint per input index. */
export async function probeEquirectHints(files: File[]): Promise<Twin360Hint[]> {
  return Promise.all(files.map((file) => probeEquirectHint(file)));
}
