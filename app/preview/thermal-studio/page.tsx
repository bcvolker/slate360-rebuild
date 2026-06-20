"use client";

import { useEffect, useState } from "react";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";

const CAPTURES: StudioCapture[] = [
  { id: "a", filename: "HM20000222005211.jpeg", metadata: { humidity_pct: 48, ambient_temp_c: 21, gps: { lat: 33.35, lon: -111.79 } }, qualityMetrics: { is_radiometric: true, avg_temp_c: 28 } },
  { id: "b", filename: "HM20000222005222.jpeg", metadata: { humidity_pct: 50 }, qualityMetrics: { is_radiometric: true } },
  { id: "c", filename: "HM20000222005231.jpeg", metadata: {}, qualityMetrics: { is_radiometric: true } },
];

export default function PreviewThermalStudio() {
  const [g, setG] = useState<ThermalProbeGrid | null>(null);
  useEffect(() => {
    fetch("/thermal-fixtures/sample-211.json").then((r) => r.json()).then(setG);
  }, []);

  // Replicate the REAL constrained chain (topbar → scroll content → layout → session
  // header → shell tabs/summary) around WorkView so the image size is measured under
  // the same height pressure as production — not at full 100dvh.
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--graphite-canvas)]">
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)] px-5 text-xs text-[var(--graphite-muted)]">top bar</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Thermal Studio</h1>
            <span className="text-xs text-[var(--graphite-muted)]">Sessions · New upload</span>
          </div>
          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="shrink-0 text-base font-bold text-[var(--graphite-text-header)]">Oak Ridge Roof — Preview</div>
              {/* summary bar + tabs (shell chrome) */}
              <div className="shrink-0 rounded-2xl border border-[var(--mobile-app-card-border)] p-3 text-xs text-[var(--graphite-muted)]">Summary bar</div>
              <div className="shrink-0 text-xs text-[var(--graphite-muted)]">Library · Inspect · Report Builder · Deliver</div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <div className="shrink-0 text-xs text-[var(--graphite-muted)]">Tune image · Detection settings</div>
                  <div className="min-h-0 flex-1">
                    <ThermalStudioWorkView captures={CAPTURES} loadGrid={async () => g} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
