"use client";

import { useSearchParams } from "next/navigation";
import { WalkthroughLibrary } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { WalkthroughExperience } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { BrandThemeForm } from "@/components/spatial-walkthrough/studio/BrandThemeForm";
import { SharePasswordGate } from "@/components/spatial-walkthrough/share/SharePasswordGate";
import { StatusPanel } from "@/components/spatial-walkthrough/StatusPanel";
import {
  PREVIEW_LIBRARY,
  PREVIEW_PATCH,
  PREVIEW_PINS,
  PREVIEW_THEME,
  PREVIEW_WAYPOINTS,
} from "@/lib/spatial-walkthrough/preview-fixtures";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";
import "@/components/spatial-walkthrough/viewer/walkthrough-markers.css";

function Viewer({ selectedId }: { selectedId?: string | null }) {
  return (
    <div className="h-[100dvh]">
      <WalkthroughExperience
        theme={PREVIEW_THEME}
        title="Level 12 — Mechanical penthouse"
        projectName="Harbor Yard · Tower A"
        capturedAt="2026-08-12T15:00:00.000Z"
        clipId="clip-1"
        waypoints={PREVIEW_WAYPOINTS}
        pins={PREVIEW_PINS}
        redactions={[]}
        operatorPatch={PREVIEW_PATCH}
        preview
        selectedId={selectedId}
        duration={248}
      />
    </div>
  );
}

function ShareCard() {
  return (
    <section className="space-y-3 border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-4 text-[var(--graphite-text-header)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Share</p>
      <h2 className="text-base font-semibold">Level 12 — Mechanical penthouse</h2>
      <p className="text-sm text-[var(--graphite-muted)]">Guest link · expires 30 Sep 2026 · downloads off</p>
      <p className="break-all border border-white/10 px-3 py-2 font-mono text-xs">https://slate360.ai/w/k7m2p9qx</p>
      <div className="flex gap-2">
        <button type="button" className="h-11 border border-white/10 px-3 text-sm">Copy link</button>
        <button type="button" className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-3 text-sm text-[var(--graphite-primary)]">Revoke</button>
      </div>
    </section>
  );
}

export function SpatialWalkthroughPreview() {
  const params = useSearchParams();
  const scene = params?.get("scene") ?? "library";

  if (scene === "viewer" || scene === "timeline") return <Viewer />;
  if (scene === "waypoint") return <Viewer selectedId="wp2" />;
  if (scene === "document-pin" || scene === "pdf-drawer" || scene === "pin-drawer") {
    return <Viewer selectedId="pin-doc" />;
  }
  if (scene === "brand-editor") {
    return (
      <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-4 text-[var(--graphite-text-header)] lg:p-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Spatial Walkthrough</p>
        <h1 className="mb-4 text-2xl font-semibold">Branding</h1>
        <BrandThemeForm initial={PREVIEW_THEME} />
      </div>
    );
  }
  if (scene === "share-modal") {
    return (
      <div className="relative min-h-[100dvh] bg-[var(--graphite-canvas)]">
        <Viewer />
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg"><ShareCard /></div>
        </div>
      </div>
    );
  }
  if (scene === "access-code") return <SharePasswordGate onSubmit={() => undefined} />;
  if (scene === "processing") {
    return (
      <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
        <StatusPanel title="Processing capture" body="The stitched master is stored. A web proxy is being prepared for playback." />
      </div>
    );
  }
  if (scene === "empty") {
    return (
      <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-6 text-[var(--graphite-text-header)]">
        <WalkthroughLibrary items={[]} hrefFor={(id) => `#${id}`} emptyAction={{ href: "#", label: "Create walkthrough" }} />
      </div>
    );
  }
  if (scene === "unavailable") {
    return (
      <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
        <StatusPanel title="Walkthrough unavailable" body="This share link is invalid, expired, or has been revoked." />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-4 text-[var(--graphite-text-header)] lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Harbor Yard</p>
      <h1 className="mb-4 text-2xl font-semibold">Spatial Walkthroughs</h1>
      <WalkthroughLibrary items={PREVIEW_LIBRARY} hrefFor={(id) => `#${id}`} />
    </div>
  );
}
