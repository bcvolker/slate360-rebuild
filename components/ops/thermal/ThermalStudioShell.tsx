"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThermalJobRealtime } from "@/hooks/useThermalJobRealtime";
import {
  StudioWorkspaceShell,
  StudioTabs,
  StudioChip,
  type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";
import { type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { ThermalLibrary } from "@/components/ops/thermal/ThermalLibrary";
import { ThermalAnalyzeTune } from "@/components/ops/thermal/ThermalAnalyzeTune";
import { ThermalMotionStudio } from "@/components/ops/thermal/ThermalMotionStudio";
import { ThermalReportBuilder } from "@/components/ops/thermal/ThermalReportBuilder";
import { ThermalDeliverables } from "@/components/ops/thermal/ThermalDeliverables";
import {
  seedReportOrder,
  persistCaptureInReport,
  persistReportSet,
} from "@/lib/thermal/curation-client";
import type { ThermalBrandingConfig, ThermalProcessingJob } from "@/lib/thermal/types";

// Internal routing keys. Only library/inspect/report are PRIMARY tabs; "motion"
// is reached from the Tools (···) menu (kept fully capable, off the core path) and
// "deliver" is folded into the Report tab via a Build | Deliver toggle.
type Stage = "library" | "inspect" | "motion" | "report" | "deliver";
type ReportView = "build" | "deliver";

// Primary tab bar — three tabs (Images → Inspect → Report).
const STAGES: { id: Stage; label: string; step: number }[] = [
  { id: "library", label: "Images", step: 1 },
  { id: "inspect", label: "Inspect", step: 2 },
  { id: "report", label: "Report", step: 3 },
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
  sessionName,
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
  const [reportView, setReportView] = useState<ReportView>("build");
  const [toolsOpen, setToolsOpen] = useState(false);
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

  const summary = useMemo<Record<string, unknown>>(
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

  const tabs: StudioTab<Stage>[] = STAGES.map((s) => ({ id: s.id, label: s.label }));
  const crit = Number(summary.critical_anomalies ?? 0);

  return (
    <StudioWorkspaceShell
      title="Thermal Studio"
      subtitle={sessionName}
      leftSlot={
        <Link
          href="/thermal-studio"
          title="All sessions"
          className="rounded p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          ←
        </Link>
      }
      tabsSlot={<StudioTabs tabs={tabs} active={stage} onChange={setStage} />}
      rightSlot={
        <>
          <StudioChip label="Images" value={captures.length} />
          {crit > 0 ? <StudioChip label="⚑ Action" value={crit} /> : null}
          {activeJob ? <JobChip status={activeJob.status} connected={connected} /> : null}
          <div className="relative">
            <button
              type="button"
              title="Tools"
              aria-label="Tools"
              onClick={() => setToolsOpen((v) => !v)}
              className="rounded px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              ⋯
            </button>
            {toolsOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-surface,#15171a)] p-1 shadow-[var(--mobile-app-card-shadow)]">
                  <button
                    type="button"
                    onClick={() => { setStage("motion"); setToolsOpen(false); }}
                    className="block w-full rounded px-3 py-2 text-left text-xs text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)]"
                  >
                    Build time-lapse / video…
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      }
    >
      {/* Active stage — chrome never scrolls; every stage owns the same
          left/center/right frame and manages its own contained scroll. */}
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

      {stage === "motion" ? (
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setStage("library")}
              className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              ← Back to Images
            </button>
            <span className="text-xs font-semibold text-[var(--graphite-text-header)]">Time-lapse / Video</span>
          </div>
          <div className="min-h-0 flex-1">
            <ThermalMotionStudio sessionId={sessionId} captures={captures} />
          </div>
        </div>
      ) : null}

      {stage === "report" ? (
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="inline-flex shrink-0 self-start rounded-lg border border-[var(--mobile-app-card-border)] p-0.5 text-xs">
            {(["build", "deliver"] as ReportView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setReportView(v)}
                className={`rounded px-3 py-1 font-semibold ${
                  reportView === v
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)]"
                }`}
              >
                {v === "build" ? "Build report" : "Deliver & share"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {reportView === "build" ? (
              <ThermalReportBuilder
                sessionId={sessionId}
                sessionName={sessionName}
                captures={captures}
                reportOrder={reportOrder}
                onReorder={reorderReport}
                onRemove={removeFromReport}
                brandingConfig={brandingConfig}
                summary={summary}
                initialTemplateId={initialTemplateId}
                initialSignature={initialSignature}
                initialConditions={conditions}
              />
            ) : (
              <ThermalDeliverables
                sessionId={sessionId}
                brandingConfig={brandingConfig}
                initialProjectId={initialProjectId}
                linkedSpaceId={linkedSpaceId}
                captures={captures}
              />
            )}
          </div>
        </div>
      ) : null}
    </StudioWorkspaceShell>
  );
}

/** Compact processing-status chip for the top bar (replaces the full job bar row). */
function JobChip({ status, connected }: { status: string; connected: boolean }) {
  const running = status === "queued" || status === "processing" || status === "running";
  const failed = status === "failed";
  const tone = failed
    ? "border-[color-mix(in_srgb,#ef4444_45%,transparent)] text-[#fca5a5]"
    : running
      ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] text-[var(--graphite-text-header)]"
      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]";
  return (
    <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          failed ? "bg-[#ef4444]" : running ? "animate-pulse bg-[var(--graphite-primary)]" : "bg-[var(--graphite-muted)]"
        }`}
      />
      {running ? "Processing…" : failed ? "Job failed" : "Idle"}
      {!connected && running ? <span className="opacity-60">·offline</span> : null}
    </span>
  );
}
