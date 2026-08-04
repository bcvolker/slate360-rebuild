"use client";

import { TwinReviewSourcesScreen } from "./review-sources/TwinReviewSourcesScreen";

export type TwinSubmitAsset = {
  id: string;
  name: string;
  assetKind: string;
  fileSizeBytes: number;
  status: string;
  contentType: string | null;
};

type Props = {
  captureId: string;
  spaceId: string;
  projectId: string;
  captureStatus: string;
  title: string;
  assets: TwinSubmitAsset[];
  canUseHighQuality?: boolean;
};

export function TwinCaptureSubmitScreen({
  captureId,
  spaceId,
  projectId,
  captureStatus,
  title,
  assets,
  canUseHighQuality = false,
}: Props) {
  return (
    <TwinReviewSourcesScreen
      allowPendingSession={false}
      canUseHighQuality={canUseHighQuality}
      initialCapture={{
        captureId,
        spaceId,
        projectId,
        title,
        captureStatus,
        assets: assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          sizeBytes: asset.fileSizeBytes,
          status: asset.status,
          contentType: asset.contentType ?? "",
          assetKind: asset.assetKind,
        })),
      }}
    />
  );
}
