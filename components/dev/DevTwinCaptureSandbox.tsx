"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TwinCaptureScreen } from "@/components/digital-twin/TwinCaptureScreen";
import { measureTwinCapturePolishLayout } from "@/components/digital-twin/measure-twin-capture-polish-layout";
import {
  DEV_TWIN_GHOST_FRAME_URL,
  parseDevCoveragePreset,
  parseDevMotionPreset,
  parseDevRollPreset,
} from "@/components/digital-twin/twin-capture-polish-dev";
import type { TwinCaptureMode } from "@/hooks/useTwinCaptureSession";
import { MOCK_TWIN_SPACES } from "@/lib/dev/mock-twin-capture";

export const DEV_TWIN_CLIP_COUNTS = [0, 1, 4] as const;

function parseClipCount(value: string | null): (typeof DEV_TWIN_CLIP_COUNTS)[number] {
  const parsed = Number.parseInt(value ?? "", 10);
  return DEV_TWIN_CLIP_COUNTS.includes(parsed as (typeof DEV_TWIN_CLIP_COUNTS)[number])
    ? (parsed as (typeof DEV_TWIN_CLIP_COUNTS)[number])
    : 0;
}

function parseMode(value: string | null): TwinCaptureMode {
  return value === "photos" ? "photos" : "video";
}

export function DevTwinCaptureSandbox() {
  const searchParams = useSearchParams();
  const clipCount = parseClipCount(searchParams?.get("clips") ?? null);
  const initialMode = parseMode(searchParams?.get("mode") ?? null);
  const forceRecording = searchParams?.get("state") === "recording";
  const coverageOverride = parseDevCoveragePreset(searchParams?.get("coverage") ?? null);
  const rollOverride = parseDevRollPreset(searchParams?.get("roll") ?? null);
  const motionOverride = parseDevMotionPreset(searchParams?.get("motion") ?? null);
  const forceGhost = searchParams?.get("ghost") === "1";

  const measureKey = useMemo(
    () =>
      `${clipCount}:${initialMode}:${forceRecording}:${coverageOverride}:${rollOverride}:${motionOverride}:${forceGhost}`,
    [clipCount, coverageOverride, forceGhost, forceRecording, initialMode, motionOverride, rollOverride],
  );

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sample = measureTwinCapturePolishLayout();
      if (!sample) return;
      const node = document.getElementById("dev-twin-capture-polish-measure");
      if (node) node.textContent = JSON.stringify(sample);
    };

    const timer = window.setTimeout(run, 180);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [measureKey]);

  return (
    <div className="h-full min-h-0">
      <TwinCaptureScreen
        spaceName={MOCK_TWIN_SPACES[0]?.name}
        devSeedClipCount={clipCount}
        devInitialMode={initialMode}
        devForceRecording={forceRecording}
        devCoverageOverride={coverageOverride}
        devRollOverride={rollOverride}
        devMotionOverride={motionOverride}
        devForceGhost={forceGhost}
        devGhostFrameUrl={forceGhost ? DEV_TWIN_GHOST_FRAME_URL : null}
        onCancel={() => {
          /* sandbox — no navigation */
        }}
      />
      <pre id="dev-twin-capture-polish-measure" className="sr-only" aria-hidden />
    </div>
  );
}
