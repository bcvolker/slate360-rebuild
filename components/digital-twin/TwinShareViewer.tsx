"use client";

import {
  ExternalPortalShell,
  PortalGlassCard,
  TokenStatePage,
  type PortalTokenState,
} from "@/components/external-portal";
import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
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
  viewerKind,
  tokenState,
}: {
  embed: boolean;
  title: string;
  orgName?: string | null;
  modelUrl: string;
  modelTitle: string;
  viewerKind: TwinViewerKind;
  tokenState?: PortalTokenState | null;
}) {
  if (tokenState) {
    return (
      <TokenStatePage
        state={tokenState}
        badge="Shared twin"
        showShell={!embed}
      />
    );
  }

  if (embed) {
    return (
      <div className="fixed inset-0 bg-[#0B0F15]">
        <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />
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
      showFooter
    >
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <PortalGlassCard className="min-h-0 flex-1 overflow-hidden !p-0">
          <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />
        </PortalGlassCard>
        <TwinViewerDisclaimer />
        <p className="text-center text-[10px] text-zinc-500">
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
      </main>
    </ExternalPortalShell>
  );
}
