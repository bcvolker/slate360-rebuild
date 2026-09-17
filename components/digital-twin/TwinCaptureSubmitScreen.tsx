"use client";

import { TwinReviewSourcesScreen } from "./review-sources/TwinReviewSourcesScreen";
import { TwinPhoneRescueBar } from "./TwinPhoneRescueBar";

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4">
        <TwinPhoneRescueBar />
      </div>
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
    </div>
  );
}
