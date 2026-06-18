"use client";

import { useState } from "react";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { ThermalTuningPanel } from "@/components/ops/thermal/ThermalTuningPanel";

type SubTab = "tune" | "detection";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "tune", label: "Tune image" },
  { id: "detection", label: "Detection settings" },
];

/**
 * Analyze & Tune workbench. Tune = large thermal image + emissivity/reflected/span
 * controls + filmstrip. Detection = anomaly thresholds. Selecting and processing
 * batches lives in the Library tab; this tab is for working an image.
 */
export function ThermalAnalyzeTune({
  sessionId,
  captures,
  activeCaptureId,
  onActiveChange,
  standards,
  initialParams,
}: {
  sessionId: string;
  captures: StudioCapture[];
  activeCaptureId?: string | null;
  onActiveChange?: (id: string) => void;
  standards?: string[];
  initialParams?: unknown;
}) {
  const [tab, setTab] = useState<SubTab>("tune");

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Analyze sub-stages">
        {SUBTABS.map((s) => {
          const active = tab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1">
        {tab === "tune" ? (
          captures.length ? (
            <ThermalStudioWorkView
              captures={captures}
              standards={standards}
              selectedId={activeCaptureId ?? undefined}
              onSelect={onActiveChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-[var(--mobile-app-card-border)] text-sm text-[var(--graphite-muted)]">
              No captures yet — upload or import from SlateDrop to start tuning.
            </div>
          )
        ) : null}

        {tab === "detection" ? (
          <div className="h-full min-h-0 overflow-y-auto">
            <ThermalTuningPanel sessionId={sessionId} initialParams={initialParams} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
