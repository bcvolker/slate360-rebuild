/**
 * Capture receipt maths — pure, so it is unit-testable and usable on the client.
 *
 * A capture's "summary" is what the phone shows once (S5 Collected) and every
 * later screen reads back: what was collected, in which settings. It is
 * derived at upload-complete from the asset rows plus the `capture_bundle.json`
 * sidecar the app writes, and stored in `digital_twin_captures.capture_metadata.summary`.
 */

export type TwinCaptureSettings = {
  captureMode?: string;
  photoIntervalSec?: number;
  exposureLocked?: boolean;
  fastShutter?: boolean;
  shutterDenominator?: number;
  highResolutionStills?: boolean;
  highResolutionStillCount?: number;
  lens?: string;
  build?: string;
};

export type TwinCaptureSummary = {
  version: 1;
  photos: number;
  videos: number;
  /** LiDAR voxels written to the PLY; 0 when no depth was collected. */
  lidarPoints: number;
  /** ARKit pose keyframes (video) + per-photo poses (stills). */
  poses: number;
  depthFrames: number;
  durationSec: number;
  bytes: number;
  /** Counts of every asset kind that landed, e.g. { photo: 189, ply_lidar: 1 }. */
  assetKinds: Record<string, number>;
  settings: TwinCaptureSettings | null;
  /** False when the bundle sidecar was missing (older app builds). */
  fromBundle: boolean;
  computedAt: string;
};

export type SummaryAssetRow = {
  asset_kind: string | null;
  file_size_bytes: number | null;
  storage_key: string | null;
  status: string | null;
};

/** The subset of capture_bundle.json this module reads. */
export type CaptureBundleLike = {
  photoCount?: number;
  clipCount?: number;
  pointCount?: number;
  keyframeCount?: number;
  depthEvidenceFrameCount?: number;
  durationSec?: number;
  captureSettings?: Record<string, unknown>;
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function isBundleAsset(row: SummaryAssetRow): boolean {
  return (row.storage_key ?? "").toLowerCase().endsWith("capture_bundle.json");
}

/**
 * Build the summary from the ready asset rows and (optionally) the parsed bundle.
 * The bundle wins for counts it knows about (LiDAR points, poses, depth frames,
 * duration); the asset rows are the source of truth for what actually landed.
 */
export function summarizeCapture(
  assets: readonly SummaryAssetRow[],
  bundle: CaptureBundleLike | null,
  now: Date = new Date(),
): TwinCaptureSummary {
  const assetKinds: Record<string, number> = {};
  let bytes = 0;
  for (const row of assets) {
    if (row.status !== "ready") continue;
    const kind = row.asset_kind ?? "other";
    assetKinds[kind] = (assetKinds[kind] ?? 0) + 1;
    bytes += num(row.file_size_bytes);
  }
  const photos = (assetKinds.photo ?? 0) + (assetKinds.drone_photo ?? 0) + (assetKinds.panorama_360 ?? 0);
  const videos = (assetKinds.video ?? 0) + (assetKinds.drone_video ?? 0);
  const settings = bundle?.captureSettings ? pickSettings(bundle.captureSettings) : null;
  return {
    version: 1,
    photos,
    videos,
    lidarPoints: num(bundle?.pointCount),
    poses: num(bundle?.keyframeCount),
    depthFrames: num(bundle?.depthEvidenceFrameCount),
    durationSec: Math.round(num(bundle?.durationSec)),
    bytes,
    assetKinds,
    settings,
    fromBundle: bundle != null,
    computedAt: now.toISOString(),
  };
}

function pickSettings(raw: Record<string, unknown>): TwinCaptureSettings {
  const out: TwinCaptureSettings = {};
  if (typeof raw.captureMode === "string") out.captureMode = raw.captureMode;
  if (typeof raw.photoIntervalSec === "number") out.photoIntervalSec = raw.photoIntervalSec;
  if (typeof raw.exposureLocked === "boolean") out.exposureLocked = raw.exposureLocked;
  if (typeof raw.fastShutter === "boolean") out.fastShutter = raw.fastShutter;
  if (typeof raw.shutterDenominator === "number") out.shutterDenominator = raw.shutterDenominator;
  if (typeof raw.highResolutionStills === "boolean") out.highResolutionStills = raw.highResolutionStills;
  if (typeof raw.highResolutionStillCount === "number") out.highResolutionStillCount = raw.highResolutionStillCount;
  if (typeof raw.lens === "string") out.lens = raw.lens;
  if (typeof raw.build === "string") out.build = raw.build;
  return out;
}

/** Read a stored summary back out of capture_metadata; null when absent or malformed. */
export function parseTwinCaptureSummary(metadata: unknown): TwinCaptureSummary | null {
  if (!metadata || typeof metadata !== "object") return null;
  const s = (metadata as { summary?: unknown }).summary;
  if (!s || typeof s !== "object") return null;
  const o = s as Partial<TwinCaptureSummary>;
  if (o.version !== 1) return null;
  return {
    version: 1,
    photos: num(o.photos),
    videos: num(o.videos),
    lidarPoints: num(o.lidarPoints),
    poses: num(o.poses),
    depthFrames: num(o.depthFrames),
    durationSec: num(o.durationSec),
    bytes: num(o.bytes),
    assetKinds: o.assetKinds && typeof o.assetKinds === "object" ? o.assetKinds : {},
    settings: o.settings && typeof o.settings === "object" ? o.settings : null,
    fromBundle: Boolean(o.fromBundle),
    computedAt: typeof o.computedAt === "string" ? o.computedAt : "",
  };
}

/**
 * Which photo becomes the twin's poster. The first frames of a walk are the
 * operator's feet and the doorway; a quarter of the way in the camera is
 * usually level and inside the room. Filenames carry the snap index
 * (twin_photo_17.jpg), so sort numerically, not lexically.
 */
export function pickPosterKey(photoKeys: readonly string[]): string | null {
  if (photoKeys.length === 0) return null;
  const indexed = photoKeys
    .map((key) => {
      const m = /(\d+)\.[a-z0-9]+$/i.exec(key);
      return { key, n: m ? Number(m[1]) : Number.POSITIVE_INFINITY };
    })
    .sort((a, b) => a.n - b.n || a.key.localeCompare(b.key));
  return indexed[Math.floor((indexed.length - 1) * 0.25)].key;
}

/** One-line human receipt: "189 photos · 1.2M LiDAR points · 3:07". */
export function describeCaptureSummary(s: TwinCaptureSummary): string {
  const parts: string[] = [];
  if (s.photos) parts.push(`${s.photos} photo${s.photos === 1 ? "" : "s"}`);
  if (s.videos) parts.push(`${s.videos} clip${s.videos === 1 ? "" : "s"}`);
  parts.push(s.lidarPoints ? `${compact(s.lidarPoints)} LiDAR points` : "no LiDAR");
  if (s.durationSec) parts.push(formatDuration(s.durationSec));
  return parts.join(" · ");
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
