"use client";

import { useCallback, useEffect, useState } from "react";
import { Share2, Layers, Info, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mobileTokens } from "@/components/mobile-system";
import { TwinAuthenticatedViewer } from "./TwinAuthenticatedViewer";
import { TwinShareActions } from "./TwinShareActions";
import { TwinVersionsPanel } from "./TwinVersionsPanel";
import { TwinMeasurementsList } from "./TwinMeasurementsList";
import { TwinGpsDisplay } from "./TwinGpsDisplay";
import { defaultTwinLayerVisibility } from "./TwinLayersPanel";
import {
  parseTwinOverlayMeasurement,
  parseTwinOverlayPin,
  type TwinOverlayMeasurement,
  type TwinOverlayPin,
} from "./TwinSceneOverlays";
import type { TwinGpsMetadata } from "@/lib/digital-twin/viewer-types";

type Viewer = {
  spaceId: string;
  modelId: string;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
};

type Props = {
  viewer: Viewer;
  spaceTitle: string;
  spaceStatus: string;
  latestGps: TwinGpsMetadata | null;
  desktopEditorEnabled: boolean;
};

type SheetKind = "share" | "versions" | "details" | null;

// Stable reference — all overlay layers visible by default in the detail viewer.
const ALL_LAYERS_VISIBLE = defaultTwinLayerVisibility();

/**
 * Twin detail screen, rebuilt (Slice 3). The old page stacked 7 components with
 * an unbounded viewer canvas overlapping everything + a raw version list running
 * off the page. This is a single-purpose "look at one twin and act on it"
 * surface: the 3D viewer is the height-bounded hero, and every twin-level action
 * (share, versions/reprocess/publish, details) lives in a tight action bar that
 * opens a focused sheet — no stacking, no pills, no overflow off the page.
 */
export function TwinDetailClient({
  viewer,
  spaceTitle,
  spaceStatus,
  latestGps,
  desktopEditorEnabled,
}: Props) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [measureRefresh, setMeasureRefresh] = useState(0);
  const [overlayPins, setOverlayPins] = useState<TwinOverlayPin[]>([]);
  const [overlayMeasurements, setOverlayMeasurements] = useState<TwinOverlayMeasurement[]>([]);

  const loadOverlays = useCallback(async () => {
    const [collabRes, measureRes] = await Promise.all([
      fetch(`/api/digital-twin/collaboration?space_id=${viewer.spaceId}`),
      fetch(`/api/digital-twin/measurements?space_id=${viewer.spaceId}`),
    ]);
    const collabJson = (await collabRes.json().catch(() => ({}))) as {
      pins?: Array<{ id: string; title: string; position: unknown }>;
    };
    const measureJson = (await measureRes.json().catch(() => ({}))) as {
      measurements?: Array<{ id: string; start_point: unknown; end_point: unknown }>;
    };
    if (collabRes.ok) {
      setOverlayPins(
        (collabJson.pins ?? []).map(parseTwinOverlayPin).filter((p): p is TwinOverlayPin => p !== null),
      );
    }
    if (measureRes.ok) {
      setOverlayMeasurements(
        (measureJson.measurements ?? [])
          .map(parseTwinOverlayMeasurement)
          .filter((m): m is TwinOverlayMeasurement => m !== null),
      );
    }
  }, [viewer.spaceId]);

  useEffect(() => {
    void loadOverlays();
  }, [loadOverlays, measureRefresh]);

  const close = useCallback(() => setSheet(null), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Compact header */}
      <div className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2">
        <Link
          href="/digital-twin"
          aria-label="Back to Twin 360"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[var(--graphite-muted)] transition hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{spaceTitle}</p>
          <p className="truncate text-[11px] capitalize text-[var(--graphite-muted)]">
            {spaceStatus.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* Viewer hero — the dominant, height-bounded surface */}
      <div className="relative mx-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10">
        <TwinAuthenticatedViewer
          spaceId={viewer.spaceId}
          modelId={viewer.modelId}
          viewerKind={viewer.viewerKind}
          modelUrl={viewer.modelUrl}
          modelTitle={viewer.modelTitle}
          layerVisible={ALL_LAYERS_VISIBLE}
          overlayPins={overlayPins}
          overlayMeasurements={overlayMeasurements}
          onMeasurementSaved={() => setMeasureRefresh((n) => n + 1)}
        />
      </div>

      {/* One action bar — twin-level actions, each opens a focused sheet */}
      <div className="grid shrink-0 grid-cols-3 gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setSheet("share")}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)] transition active:scale-[0.98]"
        >
          <Share2 className="h-5 w-5" aria-hidden />
          <span className="text-[11px] font-semibold">Share</span>
        </button>
        <button
          type="button"
          onClick={() => setSheet("versions")}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition active:scale-[0.98] hover:border-[var(--accent-border-blue)]"
        >
          <Layers className="h-5 w-5" aria-hidden />
          <span className="text-[11px] font-semibold">Versions</span>
        </button>
        <button
          type="button"
          onClick={() => setSheet("details")}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition active:scale-[0.98] hover:border-[var(--accent-border-blue)]"
        >
          <Info className="h-5 w-5" aria-hidden />
          <span className="text-[11px] font-semibold">Details</span>
        </button>
      </div>

      <Sheet open={sheet === "share"} onOpenChange={(o) => (o ? setSheet("share") : close())}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none">
          <SheetHeader className="text-left">
            <SheetTitle className={mobileTokens.appHomeSectionLabel}>Share this twin</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TwinShareActions spaceId={viewer.spaceId} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === "versions"} onOpenChange={(o) => (o ? setSheet("versions") : close())}>
        <SheetContent side="bottom" className="max-h-[min(80dvh,640px)] overflow-y-auto rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none">
          <SheetHeader className="text-left">
            <SheetTitle className={mobileTokens.appHomeSectionLabel}>Versions & reprocess</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TwinVersionsPanel spaceId={viewer.spaceId} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === "details"} onOpenChange={(o) => (o ? setSheet("details") : close())}>
        <SheetContent side="bottom" className="max-h-[min(80dvh,640px)] overflow-y-auto rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none">
          <SheetHeader className="text-left">
            <SheetTitle className={mobileTokens.appHomeSectionLabel}>Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {latestGps ? <TwinGpsDisplay gps={latestGps} /> : null}
            <TwinMeasurementsList spaceId={viewer.spaceId} refreshToken={measureRefresh} />
            {desktopEditorEnabled ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-snug text-[var(--graphite-muted)]">
                To crop, clean, or level this model, open it in the desktop studio editor.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
