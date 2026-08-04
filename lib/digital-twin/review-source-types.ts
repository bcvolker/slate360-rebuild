import type { Twin360Projection } from "./twin-equirect-probe";
import type { TwinSourceChip } from "./twin-source-chip";

export type TwinReviewOrigin = "capture" | "camera_roll" | "files" | "slatedrop";
export type TwinReviewStatus = "ready" | "pending" | "uploading" | "error";

export type TwinReviewExistingAsset = {
  id: string;
  name: string;
  sizeBytes: number;
  status: string;
  contentType: string;
  assetKind: string;
};

export type TwinReviewSource = {
  id: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  assetKind: string;
  status: TwinReviewStatus;
  origin: TwinReviewOrigin;
  file?: File;
  assetId?: string;
  thumbnailUrl?: string | null;
  projection: Twin360Projection;
  chip: TwinSourceChip;
  chipOptions: TwinSourceChip[];
  uploadProgress?: number;
  error?: string;
};

export type TwinReviewTarget = {
  spaceId: string;
  projectId: string;
  title: string;
};

export type TwinReviewInitialCapture = TwinReviewTarget & {
  captureId: string;
  captureStatus: string;
  assets: TwinReviewExistingAsset[];
};
