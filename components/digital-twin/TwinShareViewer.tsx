"use client";

import {
  ExternalPortalShell,
  TokenStatePage,
  type PortalTokenState,
} from "@/components/external-portal";
import { TwinShareAnnotateShell } from "@/components/digital-twin/TwinShareAnnotateShell";
import { TwinShareDownloadButton } from "@/components/digital-twin/TwinShareDownloadButton";
import { TwinViewerDisclaimer } from "@/components/digital-twin/TwinViewerDisclaimer";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";

export function TwinShareViewer({
  embed,
  title,
  orgName,
  modelUrl,
  modelTitle,
  modelId,
  viewerKind,
  shareToken,
  canAnnotate = false,
  canDownload = false,
  tokenState,
}: {
  embed: boolean;
  title: string;
  orgName?: string | null;
  modelUrl: string;
  modelTitle: string;
  modelId?: string | null;
  viewerKind: TwinViewerKind;
  shareToken?: string;
  canAnnotate?: boolean;
  canDownload?: boolean;
  tokenState?: PortalTokenState | null;
}) {
  if (tokenState) {
    return (
      <TokenStatePage state={tokenState} badge="Shared twin" showShell={!embed} />
    );
  }

  const viewer = shareToken ? (
    <TwinShareAnnotateShell
      shareToken={shareToken}
      canAnnotate={canAnnotate}
      viewerKind={viewerKind}
      modelUrl={modelUrl}
      modelTitle={modelTitle}
      modelId={modelId}
    />
  ) : null;

  if (embed) {
    return (
      <div className="fixed inset-0 flex flex-col bg-[var(--graphite-canvas)]">
        <div className="relative min-h-0 flex-1">{viewer}</div>
        {canDownload && shareToken ? (
          <div className="shrink-0 border-t border-[var(--accent-border-blue)] p-3">
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
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">{viewer}</div>

        <div className="shrink-0 space-y-2 border-t border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-3 py-2 sm:px-4 sm:py-3">
          {canDownload && shareToken ? (
            <TwinShareDownloadButton shareToken={shareToken} />
          ) : null}
          <TwinViewerDisclaimer className="px-1 text-center text-[11px] leading-relaxed text-[var(--graphite-muted)]" />
          <p className="text-center text-[10px] text-[var(--graphite-muted)]">
            Powered by{" "}
            <a
              href="https://www.slate360.ai"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("font-semibold", twinAccent.text, twinAccent.textHover)}
            >
              Slate360
            </a>
          </p>
        </div>
      </main>
    </ExternalPortalShell>
  );
}
