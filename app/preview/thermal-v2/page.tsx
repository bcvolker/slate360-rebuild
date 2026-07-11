"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ThermalV2Shell } from "@/components/thermal-studio-v2/ThermalV2Shell";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

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
    anomalies: [{ severity: "critical", delta_c: 14 }],
  },
  {
    id: "b",
    filename: "roof-nw-02.jpeg",
    qualityMetrics: { is_radiometric: true, sensor_model: "HIKMICRO Pocket2" },
    metadata: { in_report: true },
    anomalies: [{ severity: "advisory", delta_c: 3 }],
  },
  { id: "c", filename: "panel-east-01.jpeg", qualityMetrics: { is_radiometric: false, sensor_model: "FLIR E8" } },
  { id: "d", filename: "panel-east-02.jpeg", qualityMetrics: { is_radiometric: true, sensor_model: "FLIR E8" } },
  { id: "e", filename: "attic-vent-01.jpeg", qualityMetrics: { is_radiometric: true, sensor_model: "FLIR E8" } },
];

function PreviewThermalV2Inner() {
  // ?empty=1 swaps in zero captures — lets e2e/manual QA reach the W1 "Start
  // strip" empty state without a real upload round trip.
  const empty = useSearchParams().get("empty") === "1";
  const captures = empty ? [] : CAPTURES;

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
            <ThermalV2Shell sessionId="preview" sessionName="Oak Ridge Roof — Preview" captures={captures} />
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
