"use client";

import { ThermalStudioShell } from "@/components/ops/thermal/ThermalStudioShell";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

const CAPTURES: StudioCapture[] = [
  { id: "a", filename: "HM20000222005211.jpeg", qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2 (HM-TP42)", is_radiometric: true, avg_temp_c: 28, emissivity_used: 0.95 }, metadata: { humidity_pct: 48, ambient_temp_c: 21, gps: { lat: 33.35, lon: -111.79 } } },
  { id: "b", filename: "HM20000222005222.jpeg", qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2 (HM-TP42)", is_radiometric: true }, metadata: {} },
];

export default function PreviewThermalStudioShell() {
  // Faithfully replicate the REAL chain: dashboard main (100dvh) → top bar →
  // content (flex-1 overflow-y-auto p-6) → thermal layout (h-full flex col +
  // header) → session page (flex h-full + back row). If this scrolls, the real
  // app scrolls. (The old harness rendered the shell directly at 100dvh and so
  // never caught the page-level scroll.)
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--graphite-canvas)]">
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)] px-5 text-xs text-[var(--graphite-muted)]">
        top bar (dashboard chrome)
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-3 lg:px-0">
          <header className="mb-3 flex shrink-0 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--graphite-text-header)]">Thermal Studio</h1>
              <p className="text-sm text-[var(--graphite-muted)]">Private radiometric inspection workspace</p>
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-[var(--graphite-muted)]">←</span>
                <h1 className="truncate text-base font-bold text-[var(--graphite-text-header)]">Oak Ridge Roof — Preview</h1>
              </div>
              <div className="min-h-0 flex-1">
                <ThermalStudioShell
                  sessionId="preview"
                  sessionName="Oak Ridge Roof — Preview"
                  captures={CAPTURES}
                  initialJob={null}
                  brandingConfig={{} as never}
                  initialParams={undefined}
                  linkedSpaceId={null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
