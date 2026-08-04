"use client";

import {
  ExternalPortalShell,
  TokenStatePage,
  type PortalTokenState,
} from "@/components/external-portal";
import { TwinShareAnnotateShell } from "@/components/digital-twin/TwinShareAnnotateShell";
import { TwinShareDownloadButton } from "@/components/digital-twin/TwinShareDownloadButton";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { TwinShareLidarLayerSwitcher } from "@/components/digital-twin/TwinShareLidarLayerSwitcher";
import { LidarPointCloudViewer } from "@/components/digital-twin/lidar/LidarPointCloudViewer";

export function TwinShareViewer({
  embed,
  title,
  orgName,
  modelUrl,
  modelTitle,
  modelId,
  lidarModelId,
  viewerKind,
  shareToken,
  canAnnotate = false,
  canDownload = false,
  tokenState,
  qualityMetrics,
  georef,
}: {
  embed: boolean;
  title: string;
  orgName?: string | null;
  modelUrl: string;
  modelTitle: string;
  modelId?: string | null;
  lidarModelId?: string | null;
  viewerKind: TwinViewerKind;
  shareToken?: string;
  canAnnotate?: boolean;
  canDownload?: boolean;
  tokenState?: PortalTokenState | null;
  qualityMetrics?: Record<string, unknown> | null;
  georef?: Record<string, unknown> | null;
}) {
  if (tokenState) {
    return (
      <TokenStatePage state={tokenState} badge="Shared twin" showShell={!embed} />
    );
  }

  const visualViewer = shareToken ? (
    <TwinShareAnnotateShell
      shareToken={shareToken}
      canAnnotate={canAnnotate}
      viewerKind={viewerKind}
      modelUrl={modelUrl}
      modelTitle={modelTitle}
      modelId={modelId}
      qualityMetrics={qualityMetrics}
      georef={georef}
    />
  ) : null;
  const viewer =
    shareToken && lidarModelId && viewerKind !== "lidar" ? (
      <TwinShareLidarLayerSwitcher
        visual={visualViewer}
        shareToken={shareToken}
        lidarModelId={lidarModelId}
      />
    ) : viewerKind === "lidar" && shareToken ? (
      <LidarPointCloudViewer
        baseUrl={`/api/share/twin/${shareToken}/lidar`}
        modelId={lidarModelId}
      />
    ) : (
      visualViewer
    );

  if (embed) {
    return (
      <div className="fixed inset-0 bg-[var(--graphite-canvas)]">
        {viewer}
        {canDownload && shareToken ? (
          <div className="pointer-events-auto absolute right-3 top-3 z-30">
            <TwinShareDownloadButton shareToken={shareToken} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ExternalPortalShell
      portalLabel="Shared twin"
      title={title}
      subtitle={orgName ? `Shared by ${orgName}` : "Interactive 3D model"}
      orgName={orgName ?? undefined}
      variant="immersive"
      accent="twin"
      showFooter={false}
    >
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {viewer}
        {canDownload && shareToken ? (
          <div className="pointer-events-auto absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30">
            <TwinShareDownloadButton shareToken={shareToken} />
          </div>
        ) : null}
      </main>
    </ExternalPortalShell>
  );
}
