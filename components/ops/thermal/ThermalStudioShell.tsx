"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useThermalJobRealtime } from "@/hooks/useThermalJobRealtime";
import { ThermalJobStatusBar } from "@/components/ops/thermal/ThermalJobStatusBar";
import { ThermalSessionSummaryBar } from "@/components/ops/thermal/ThermalSessionSummaryBar";
import { type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { ThermalLibrary } from "@/components/ops/thermal/ThermalLibrary";
import { ThermalAnalyzeTune } from "@/components/ops/thermal/ThermalAnalyzeTune";
import { ThermalReportBuilder } from "@/components/ops/thermal/ThermalReportBuilder";
import { ThermalDeliverables } from "@/components/ops/thermal/ThermalDeliverables";
import {
  seedReportOrder,
  persistCaptureInReport,
  persistReportSet,
} from "@/lib/thermal/curation-client";
import type { ThermalBrandingConfig, ThermalProcessingJob } from "@/lib/thermal/types";

type Stage = "library" | "inspect" | "report" | "deliver";

const STAGES: { id: Stage; label: string; step: number }[] = [
  { id: "library", label: "Library", step: 1 },
  { id: "inspect", label: "Inspect", step: 2 },
  { id: "report", label: "Report Builder", step: 3 },
  { id: "deliver", label: "Deliver", step: 4 },
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
  /** Server-computed session summary (captures / anomalies / max temp). */
  summaryMetrics?: Record<string, unknown> | null;
  /** Ordered report set (capture ids) from session metadata. */
  reportSet?: string[] | null;
  /** Site conditions from session metadata. */
  conditions?: Record<string, unknown> | null;
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
  summaryMetrics,
  reportSet,
  conditions,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("library");
  const [activeCaptureId, setActiveCaptureId] = useState<string | null>(captures[0]?.id ?? null);
  const { job, connected } = useThermalJobRealtime(sessionId);
  const activeJob = job ?? initialJob;

  // The session page loads captures once, server-side. When a cloud job finishes,
  // re-run the server component so freshly-decoded captures / anomalies appear —
  // without this the Library/Inspect tabs stay empty and processing "feels broken".
  const lastRefreshedJob = useRef<string | null>(null);
  useEffect(() => {
    if (!job) return;
    if (job.status !== "completed" && job.status !== "failed") return;
    const key = `${job.id}:${job.status}`;
    if (lastRefreshedJob.current === key) return;
    lastRefreshedJob.current = key;
    router.refresh();
  }, [job, router]);

  const summary = useMemo(
    () => ({
      ...(summaryMetrics ?? {}),
      total_captures: captures.length,
    }),
    [summaryMetrics, captures.length],
  );

  // Shared report-set order so Library curation and Report Builder stay in sync
  // within a session (server is the source of truth on next load).
  const [reportOrder, setReportOrder] = useState<string[]>(() =>
    seedReportOrder(captures, reportSet),
  );
  function commitOrder(next: string[]) {
    setReportOrder(next);
    void persistReportSet(sessionId, next);
  }
  function toggleInReport(id: string) {
    const has = reportOrder.includes(id);
    const next = has ? reportOrder.filter((x) => x !== id) : [...reportOrder, id];
    void persistCaptureInReport(id, !has, has ? 0 : next.length - 1);
    commitOrder(next);
  }
  function addToReport(ids: string[]) {
    const toAdd = ids.filter((id) => !reportOrder.includes(id));
    if (!toAdd.length) return;
    const next = [...reportOrder, ...toAdd];
    toAdd.forEach((id, i) => void persistCaptureInReport(id, true, reportOrder.length + i));
    commitOrder(next);
  }
  function reorderReport(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= reportOrder.length) return;
    const next = [...reportOrder];
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((id, i) => void persistCaptureInReport(id, true, i));
    commitOrder(next);
  }
  function removeFromReport(id: string) {
    void persistCaptureInReport(id, false, 0);
    commitOrder(reportOrder.filter((x) => x !== id));
  }

  // One workflow: opening an image in the Library jumps to the Inspect workbench.
  function openInWorkbench(id: string) {
    setActiveCaptureId(id);
    setStage("inspect");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Persistent session summary — always visible across stages. */}
      <ThermalSessionSummaryBar summary={summary} />

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
        {stage === "library" ? (
          <ThermalLibrary
            sessionId={sessionId}
            captures={captures}
            onOpenCapture={openInWorkbench}
            reportOrder={reportOrder}
            onToggleInReport={toggleInReport}
            onAddToReport={addToReport}
          />
        ) : null}

        {stage === "inspect" ? (
          <ThermalAnalyzeTune
            sessionId={sessionId}
            captures={captures}
            activeCaptureId={activeCaptureId}
            onActiveChange={setActiveCaptureId}
            standards={standards}
            initialParams={initialParams}
          />
        ) : null}

        {stage === "report" ? (
          <ThermalReportBuilder
            sessionId={sessionId}
            captures={captures}
            reportOrder={reportOrder}
            onReorder={reorderReport}
            onRemove={removeFromReport}
            initialTemplateId={initialTemplateId}
            initialSignature={initialSignature}
            initialConditions={conditions}
          />
        ) : null}

        {stage === "deliver" ? (
          <ThermalDeliverables
            sessionId={sessionId}
            brandingConfig={brandingConfig}
            initialProjectId={initialProjectId}
            linkedSpaceId={linkedSpaceId}
          />
        ) : null}
      </div>
    </div>
  );
}
