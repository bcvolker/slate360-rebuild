"use client";

import { ThermalV2Shell } from "@/components/thermal-studio-v2/ThermalV2Shell";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

const CAPTURES: ThermalV2Capture[] = [
  { id: "a", filename: "roof-nw-01.jpeg", selected: true },
  { id: "b", filename: "roof-nw-02.jpeg", selected: true },
  { id: "c", filename: "panel-east-01.jpeg" },
  { id: "d", filename: "panel-east-02.jpeg" },
  { id: "e", filename: "attic-vent-01.jpeg" },
];

export default function PreviewThermalV2() {
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
            <ThermalV2Shell sessionName="Oak Ridge Roof — Preview" captures={CAPTURES} />
          </div>
        </div>
      </div>
    </div>
  );
}
