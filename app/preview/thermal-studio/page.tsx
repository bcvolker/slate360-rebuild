"use client";

import { useEffect, useState } from "react";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";
import { ThermalLibrary } from "@/components/ops/thermal/ThermalLibrary";
import { ThermalMotionStudio } from "@/components/ops/thermal/ThermalMotionStudio";
import { ThermalReportBuilder } from "@/components/ops/thermal/ThermalReportBuilder";
import { ThermalDeliverables } from "@/components/ops/thermal/ThermalDeliverables";
import {
  StudioWorkspaceShell,
  StudioTabs,
  StudioChip,
  type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";

const CAPTURES: StudioCapture[] = [
  { id: "a", filename: "HM20000222005211.jpeg", metadata: { humidity_pct: 48, ambient_temp_c: 21, gps: { lat: 33.35, lon: -111.79 } }, qualityMetrics: { is_radiometric: true, avg_temp_c: 28 }, anomalies: [{ id: "x" }, { id: "y" }] },
  { id: "b", filename: "HM20000222005222.jpeg", metadata: { humidity_pct: 50 }, qualityMetrics: { is_radiometric: true } },
  { id: "c", filename: "HM20000222005231.jpeg", metadata: {}, qualityMetrics: { is_radiometric: true }, anomalies: [{ id: "z" }] },
];

type Stage = "library" | "inspect" | "motion" | "report" | "deliver";
type ReportView = "build" | "deliver";
// Mirrors ThermalStudioShell: 3 primary tabs; motion via Tools (···); deliver folded into Report.
const TABS: StudioTab<Stage>[] = [
  { id: "library", label: "Images" },
  { id: "inspect", label: "Inspect" },
  { id: "report", label: "Report" },
];

export default function PreviewThermalStudio() {
  const [g, setG] = useState<ThermalProbeGrid | null>(null);
  const [stage, setStage] = useState<Stage>("inspect");
  const [reportView, setReportView] = useState<ReportView>("build");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(["a", "c"]);
  useEffect(() => {
    fetch("/thermal-fixtures/sample-211.json").then((r) => r.json()).then(setG);
  }, []);
  const toggleInReport = (id: string) =>
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const reorder = (idx: number, dir: -1 | 1) =>
    setOrder((o) => {
      const j = idx + dir;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });

  // Faithfully replicate the REAL chain: dashboard top bar → thermal layout (full-bleed
  // p-4 scroll wrapper) → session page (h-full) → StudioWorkspaceShell → Inspect.
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--graphite-canvas)]" data-mobile-route="platform">
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)] px-5 text-xs text-[var(--graphite-muted)]">
        dashboard top bar
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">
        <div className="h-full min-h-0">
          <StudioWorkspaceShell
            title="Thermal Studio"
            subtitle="Oak Ridge Roof — Preview"
            leftSlot={<span className="rounded p-1 text-[var(--graphite-muted)]">←</span>}
            tabsSlot={<StudioTabs tabs={TABS} active={stage} onChange={setStage} />}
            rightSlot={
              <>
                <StudioChip label="Images" value={CAPTURES.length} />
                <StudioChip label="⚑" value={2} />
                <StudioChip label="Max" value="61°C" />
                <div className="relative">
                  <button type="button" title="Tools" aria-label="Tools" onClick={() => setToolsOpen((v) => !v)} className="rounded px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">⋯</button>
                  {toolsOpen ? (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} />
                      <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-surface,#15171a)] p-1 shadow-[var(--mobile-app-card-shadow)]">
                        <button type="button" onClick={() => { setStage("motion"); setToolsOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-xs text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)]">Build time-lapse / video…</button>
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            }
          >
            {stage === "library" ? (
              <ThermalLibrary
                sessionId="preview"
                captures={CAPTURES}
                onOpenCapture={() => setStage("inspect")}
                reportOrder={order}
                onToggleInReport={toggleInReport}
                onAddToReport={(ids) => setOrder((o) => [...new Set([...o, ...ids])])}
              />
            ) : null}
            {stage === "inspect" ? (
              <ThermalStudioWorkView sessionId="preview" captures={CAPTURES} loadGrid={async () => g} />
            ) : null}
            {stage === "motion" ? (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => setStage("library")} className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">← Back to Images</button>
                  <span className="text-xs font-semibold text-[var(--graphite-text-header)]">Time-lapse / Video</span>
                </div>
                <div className="min-h-0 flex-1"><ThermalMotionStudio sessionId="preview" captures={CAPTURES} /></div>
              </div>
            ) : null}
            {stage === "report" ? (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="inline-flex shrink-0 self-start rounded-lg border border-[var(--mobile-app-card-border)] p-0.5 text-xs">
                  {(["build", "deliver"] as ReportView[]).map((v) => (
                    <button key={v} type="button" onClick={() => setReportView(v)} className={`rounded px-3 py-1 font-semibold ${reportView === v ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}`}>{v === "build" ? "Build report" : "Deliver & share"}</button>
                  ))}
                </div>
                <div className="min-h-0 flex-1">
                  {reportView === "build" ? (
                    <ThermalReportBuilder
                      sessionId="preview"
                      sessionName="Oak Ridge Roof — Preview"
                      captures={CAPTURES}
                      reportOrder={order}
                      onReorder={reorder}
                      onRemove={(id) => setOrder((o) => o.filter((x) => x !== id))}
                      brandingConfig={{ company_name: "Slate360 Thermography", logo_url: "", primary_color: "", show_metrics: true, custom_footer: "Confidential — for client use only." } as never}
                      summary={{ total_captures: 3, critical_anomalies: 2, max_detected_temp_c: 61 }}
                    />
                  ) : (
                    <ThermalDeliverables sessionId="preview" brandingConfig={{} as never} captures={CAPTURES} />
                  )}
                </div>
              </div>
            ) : null}
          </StudioWorkspaceShell>
        </div>
      </div>
    </div>
  );
}
