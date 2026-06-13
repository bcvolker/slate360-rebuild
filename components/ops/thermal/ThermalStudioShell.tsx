"use client";

import { useState } from "react";
import { useThermalJobRealtime } from "@/hooks/useThermalJobRealtime";
import { ThermalJobStatusBar } from "@/components/ops/thermal/ThermalJobStatusBar";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { ThermalSessionActions } from "@/components/ops/thermal/ThermalSessionActions";
import { ThermalTuningPanel } from "@/components/ops/thermal/ThermalTuningPanel";
import { ThermalBrandingPanel } from "@/components/ops/thermal/ThermalBrandingPanel";
import { ThermalTwinLayerPanel } from "@/components/ops/thermal/ThermalTwinLayerPanel";
import type { ThermalBrandingConfig, ThermalProcessingJob } from "@/lib/thermal/types";

type Stage = "captures" | "analyze" | "deliverables" | "twin";

const STAGES: { id: Stage; label: string; step: number }[] = [
  { id: "captures", label: "Captures", step: 1 },
  { id: "analyze", label: "Analyze & Tune", step: 2 },
  { id: "deliverables", label: "Deliverables", step: 3 },
  { id: "twin", label: "Twin", step: 4 },
];

type Props = {
  sessionId: string;
  sessionName: string;
  captures: StudioCapture[];
  initialJob: ThermalProcessingJob | null;
  brandingConfig: ThermalBrandingConfig;
  initialParams?: unknown;
  linkedSpaceId: string | null;
};

export function ThermalStudioShell({
  sessionId,
  sessionName,
  captures,
  initialJob,
  brandingConfig,
  initialParams,
  linkedSpaceId,
}: Props) {
  const [stage, setStage] = useState<Stage>("captures");
  const { job, connected } = useThermalJobRealtime(sessionId);
  const activeJob = job ?? initialJob;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Stepper nav */}
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Studio stages">
        {STAGES.map((s) => {
          const active = stage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStage(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "bg-[color-mix(in_srgb,var(--graphite-muted)_24%,transparent)] text-[var(--graphite-text-body)]"
                }`}
              >
                {s.step}
              </span>
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Persistent processing status so it's always clear whether a job is running */}
      {activeJob ? <ThermalJobStatusBar job={activeJob} connected={connected} /> : null}

      {/* Active stage */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === "captures" ? (
          captures.length ? (
            <ThermalStudioWorkView captures={captures} />
          ) : (
            <div className="rounded-2xl border border-[var(--mobile-app-card-border)] p-8 text-center text-sm text-[var(--graphite-muted)]">
              No captures yet. Upload thermal files to begin.
            </div>
          )
        ) : null}

        {stage === "analyze" ? (
          <div className="space-y-4">
            <ThermalSessionActions sessionId={sessionId} captureCount={captures.length} />
            <ThermalTuningPanel sessionId={sessionId} initialParams={initialParams} />
          </div>
        ) : null}

        {stage === "deliverables" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ThermalBrandingPanel sessionId={sessionId} initial={brandingConfig} />
            <div className="rounded-2xl border border-[var(--mobile-app-card-border)] p-4 text-sm text-[var(--graphite-muted)]">
              <p className="font-semibold text-[var(--graphite-text-header)]">{sessionName}</p>
              <p className="mt-1">
                Generate the PDF report, share link, and exports from the Analyze stage actions. Manage report
                templates from the Thermal Studio menu.
              </p>
            </div>
          </div>
        ) : null}

        {stage === "twin" ? (
          <ThermalTwinLayerPanel sessionId={sessionId} linkedSpaceId={linkedSpaceId} />
        ) : null}
      </div>
    </div>
  );
}
