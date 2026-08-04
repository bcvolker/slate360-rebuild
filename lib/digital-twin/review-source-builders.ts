import type { Twin360Projection } from "./twin-equirect-probe";
import type {
  TwinCapturePendingSession,
  TwinReviewAddedSource,
} from "./twin-capture-pending-session";
import type { TwinReviewExistingAsset, TwinReviewSource } from "./review-source-types";
import {
  assetKindForChip,
  availableChipsForFile,
  chipForAssetKind,
  defaultChipForFile,
  isVideoDescriptor,
  type TwinFileDescriptor,
  type TwinSourceChip,
} from "./twin-source-chip";

type UploadRow = {
  file: File;
  status: string;
  progress: number;
  error?: string;
};

type Args = {
  session: TwinCapturePendingSession | null;
  addedSources: TwinReviewAddedSource[];
  assets: TwinReviewExistingAsset[];
  hints: Map<File, Twin360Projection>;
  overrides: Record<string, TwinSourceChip>;
  uploadRows: UploadRow[];
  completedKeys: Set<string>;
};

export function reviewFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function buildReviewSources({
  session,
  addedSources,
  assets,
  hints,
  overrides,
  uploadRows,
  completedKeys,
}: Args): TwinReviewSource[] {
  const rows = assets.map((asset) => buildPersistedSource(asset, overrides[asset.id]));

  for (const clip of session?.clips ?? []) {
    clip.files.forEach((file, index) => {
      rows.push(
        buildLocalSource({
          id: `clip-${clip.id}-${index}`,
          file,
          origin: "capture",
          thumbnailUrl: index === 0 ? clip.thumbnailUrl : null,
          projection: hints.get(file) ?? "unknown",
          override: overrides[`clip-${clip.id}-${index}`],
          uploadRows,
          completedKeys,
        }),
      );
    });
  }

  for (const file of session?.lidarFiles ?? []) {
    rows.push(
      buildLocalSource({
        id: `lidar-${reviewFileKey(file)}`,
        file,
        origin: "capture",
        projection: hints.get(file) ?? "unknown",
        override: overrides[`lidar-${reviewFileKey(file)}`],
        uploadRows,
        completedKeys,
      }),
    );
  }

  for (const source of addedSources) {
    if (source.origin === "slatedrop") {
      rows.push(
        buildDescriptorSource({
          id: source.id,
          descriptor: { name: source.pickerFile.name, type: source.pickerFile.type },
          sizeBytes: source.pickerFile.size,
          origin: "slatedrop",
          override: overrides[source.id],
        }),
      );
      continue;
    }
    rows.push(
      buildLocalSource({
        id: source.id,
        file: source.file,
        origin: source.origin,
        projection: hints.get(source.file) ?? "unknown",
        override: overrides[source.id],
        uploadRows,
        completedKeys,
      }),
    );
  }

  return rows;
}

export function estimateFrameCount(sources: TwinReviewSource[]): number {
  let frames = 0;
  for (const source of sources) {
    frames += source.chip === "lidar" ? 1 : isVideoSource(source) ? 8 : 1;
  }
  return Math.max(1, frames);
}

function isVideoSource(source: TwinReviewSource): boolean {
  return isVideoDescriptor({ name: source.name, type: source.contentType });
}

function buildPersistedSource(
  asset: TwinReviewExistingAsset,
  override?: TwinSourceChip,
): TwinReviewSource {
  return buildDescriptorSource({
    id: asset.id,
    descriptor: { name: asset.name, type: asset.contentType },
    sizeBytes: asset.sizeBytes,
    origin: "capture",
    assetId: asset.id,
    assetKind: asset.assetKind,
    status: persistedStatus(asset.status),
    override: override ?? chipForAssetKind(asset.assetKind),
  });
}

function buildLocalSource(args: {
  id: string;
  file: File;
  origin: "capture" | "camera_roll" | "files";
  thumbnailUrl?: string | null;
  projection: Twin360Projection;
  override?: TwinSourceChip;
  uploadRows: UploadRow[];
  completedKeys: Set<string>;
}): TwinReviewSource {
  const uploadRow = args.uploadRows.find((row) => row.file === args.file);
  const status = uploadRow
    ? localStatus(uploadRow.status)
    : args.completedKeys.has(reviewFileKey(args.file))
      ? "ready"
      : "pending";
  return buildDescriptorSource({
    id: args.id,
    descriptor: { name: args.file.name, type: args.file.type },
    sizeBytes: args.file.size,
    origin: args.origin,
    file: args.file,
    thumbnailUrl: args.thumbnailUrl,
    projection: args.projection,
    override: args.override,
    status,
    uploadProgress: uploadRow?.progress,
    error: uploadRow?.error,
  });
}

function buildDescriptorSource(args: {
  id: string;
  descriptor: TwinFileDescriptor;
  sizeBytes: number;
  origin: TwinReviewSource["origin"];
  file?: File;
  assetId?: string;
  thumbnailUrl?: string | null;
  projection?: Twin360Projection;
  assetKind?: string;
  status?: TwinReviewSource["status"];
  override?: TwinSourceChip;
  uploadProgress?: number;
  error?: string;
}): TwinReviewSource {
  const projection = args.projection ?? "unknown";
  const options = availableChipsForFile(args.descriptor, projection);
  const fallback = args.assetKind
    ? chipForAssetKind(args.assetKind)
    : defaultChipForFile(args.descriptor, projection);
  const chip =
    args.override && options.includes(args.override)
      ? args.override
      : options.includes(fallback)
        ? fallback
        : options[0] ?? "phone";

  return {
    id: args.id,
    name: args.descriptor.name,
    sizeBytes: args.sizeBytes,
    contentType: args.descriptor.type || "application/octet-stream",
    assetKind: args.assetKind ?? assetKindForChip(chip, args.descriptor),
    status: args.status ?? "pending",
    origin: args.origin,
    file: args.file,
    assetId: args.assetId,
    thumbnailUrl: args.thumbnailUrl,
    projection,
    chip,
    chipOptions: options,
    uploadProgress: args.uploadProgress,
    error: args.error,
  };
}

function localStatus(status: string): TwinReviewSource["status"] {
  if (status === "complete") return "ready";
  if (status === "uploading" || status === "paused") return "uploading";
  if (status === "error" || status === "aborted") return "error";
  return "pending";
}

function persistedStatus(status: string): TwinReviewSource["status"] {
  if (status === "ready") return "ready";
  if (status === "uploading" || status === "pending") return "uploading";
  return "error";
}
