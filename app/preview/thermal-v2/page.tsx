"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ThermalV2Shell } from "@/components/thermal-studio-v2/ThermalV2Shell";
import type { ThermalV2Capture, ThermalV2Tab } from "@/components/thermal-studio-v2/types";

const CAPTURES: ThermalV2Capture[] = [
  {
    id: "a",
    filename: "roof-nw-01.jpeg",
    qualityMetrics: { is_radiometric: true, sensor_model: "HIKMICRO Pocket2", resolution: "640 × 512" },
    metadata: {
      visual_pair_id: "vis-1",
      gps: { lat: 33.4213, lon: -111.9268 },
      ambient_temp_c: 21.5,
      humidity_pct: 48,
      compass: "0° N",
      captured_at: "2026-06-22 18:04",
    },
    anomalies: [
      { id: "an-1", type: "hot_spot", severity: "action", temp_c: 42, delta_c: 14, bbox: { x: 80, y: 60, w: 60, h: 40 }, observation: "Localized heating consistent with electrical resistance or friction." },
    ],
  },
  {
    id: "b",
    filename: "roof-nw-02.jpeg",
    qualityMetrics: { is_radiometric: true, sensor_model: "HIKMICRO Pocket2" },
    metadata: { in_report: true },
    anomalies: [{ id: "an-2", type: "cold_bridge", severity: "info", temp_c: 12, delta_c: 3, bbox: { x: 20, y: 20, w: 40, h: 30 } }],
  },
  { id: "c", filename: "panel-east-01.jpeg", qualityMetrics: { is_radiometric: false, sensor_model: "FLIR E8" } },
  { id: "d", filename: "panel-east-02.jpeg", qualityMetrics: { is_radiometric: true, sensor_model: "FLIR E8" } },
  { id: "e", filename: "attic-vent-01.jpeg", qualityMetrics: { is_radiometric: true, sensor_model: "FLIR E8" } },
  // S6.5 fusion: "a"'s dual-lens visual-photo pair (a real row, no radiometric grid — see lib/thermal/pair-visual-apply.ts).
  {
    id: "vis-1",
    filename: "roof-nw-01-visual.jpeg",
    previewUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='512'%3E%3Crect width='640' height='512' fill='%23667788'/%3E%3C/svg%3E",
    qualityMetrics: { is_radiometric: false, sensor_model: "HIKMICRO Pocket2" },
    // Visual-only pair row — not subject to AI thermal-anomaly detection, so it
    // must not shift the Library "Not AI-analyzed" count (anomalies==null test).
    anomalies: [],
  },
];

function PreviewThermalV2Inner() {
  // ?empty=1 swaps in zero captures — lets e2e/manual QA reach the W1 "Start
  // strip" empty state without a real upload round trip.
  const searchParams = useSearchParams();
  const empty = searchParams.get("empty") === "1";
  const captures = empty ? [] : CAPTURES;
  // ?tab=report (TS-SD) exercises ThermalV2Shell's initialTab prop — the same
  // mechanism the real /thermal-studio-v2/[sessionId]?report=1 route uses.
  const initialTab = (searchParams.get("tab") as ThermalV2Tab | null) ?? undefined;

  // Replicates the real embedding chain (dashboard shell → top bar → scroll
  // container → session header → studio shell) so page-level scroll bugs
  // reproduce here identically to production. See app/preview/thermal-studio-shell
  // for the same pattern on the old (untouched) thermal UI.
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--graphite-canvas)]">
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)] px-5 text-xs text-[var(--graphite-muted)]">
        top bar (dashboard chrome)
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-3 lg:px-0">
          <header className="mb-3 flex shrink-0 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--graphite-text-header)]">Thermal Studio V2 — preview</h1>
              <p className="text-sm text-[var(--graphite-muted)]">
                Parallel build behind /preview/thermal-v2 — /thermal-studio is untouched
              </p>
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <ThermalV2Shell sessionId="preview" sessionName="Oak Ridge Roof — Preview" captures={captures} initialTab={initialTab} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewThermalV2() {
  return (
    <Suspense fallback={null}>
      <PreviewThermalV2Inner />
    </Suspense>
  );
}
