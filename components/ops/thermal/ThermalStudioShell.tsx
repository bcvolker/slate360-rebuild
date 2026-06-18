"use client";

import { useState } from "react";
import { useThermalJobRealtime } from "@/hooks/useThermalJobRealtime";
import { ThermalJobStatusBar } from "@/components/ops/thermal/ThermalJobStatusBar";
import { type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { ThermalLibrary } from "@/components/ops/thermal/ThermalLibrary";
import { ThermalAnalyzeTune } from "@/components/ops/thermal/ThermalAnalyzeTune";
import { ThermalDeliverables } from "@/components/ops/thermal/ThermalDeliverables";
import { ThermalTwinLayerPanel } from "@/components/ops/thermal/ThermalTwinLayerPanel";
import type { ThermalBrandingConfig, ThermalProcessingJob } from "@/lib/thermal/types";

type Stage = "captures" | "analyze" | "deliverables" | "twin";

const STAGES: { id: Stage; label: string; step: number }[] = [
  { id: "captures", label: "Library", step: 1 },
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
  /** Standards from the resolved report template — drives finding descriptions. */
  standards?: string[];
  initialTemplateId?: string | null;
  initialSignature?: string | null;
  initialProjectId?: string | null;
};

export function ThermalStudioShell({
  sessionId,
  captures,
  initialJob,
  brandingConfig,
  initialParams,
  linkedSpaceId,
  standards,
  initialTemplateId,
  initialSignature,
  initialProjectId,
}: Props) {
  const [stage, setStage] = useState<Stage>("captures");
  const [activeCaptureId, setActiveCaptureId] = useState<string | null>(captures[0]?.id ?? null);
  const { job, connected } = useThermalJobRealtime(sessionId);
  const activeJob = job ?? initialJob;

  // One workflow: opening an image in the Library jumps to the Analyze workbench.
  function openInWorkbench(id: string) {
    setActiveCaptureId(id);
    setStage("analyze");
  }

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

      {/* Active stage — chrome never scrolls; each stage manages its own space. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {stage === "captures" ? (
          <ThermalLibrary sessionId={sessionId} captures={captures} onOpenCapture={openInWorkbench} />
        ) : null}

        {stage === "analyze" ? (
          <ThermalAnalyzeTune
            sessionId={sessionId}
            captures={captures}
            activeCaptureId={activeCaptureId}
            onActiveChange={setActiveCaptureId}
            standards={standards}
            initialParams={initialParams}
          />
        ) : null}

        {stage === "deliverables" ? (
          <ThermalDeliverables
            sessionId={sessionId}
            brandingConfig={brandingConfig}
            initialTemplateId={initialTemplateId}
            initialSignature={initialSignature}
            initialProjectId={initialProjectId}
          />
        ) : null}

        {stage === "twin" ? (
          <ThermalTwinLayerPanel sessionId={sessionId} linkedSpaceId={linkedSpaceId} />
        ) : null}
      </div>
    </div>
  );
}
