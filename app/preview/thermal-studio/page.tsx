"use client";

import { useEffect, useState } from "react";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";
import { ThermalLibrary } from "@/components/ops/thermal/ThermalLibrary";
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

type Stage = "library" | "inspect" | "report" | "deliver";
const TABS: StudioTab<Stage>[] = [
  { id: "library", label: "Library" },
  { id: "inspect", label: "Inspect" },
  { id: "report", label: "Report Builder" },
  { id: "deliver", label: "Deliver" },
];

export default function PreviewThermalStudio() {
  const [g, setG] = useState<ThermalProbeGrid | null>(null);
  const [stage, setStage] = useState<Stage>("inspect");
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
            {stage === "report" ? (
              <ThermalReportBuilder
                sessionId="preview"
                captures={CAPTURES}
                reportOrder={order}
                onReorder={reorder}
                onRemove={(id) => setOrder((o) => o.filter((x) => x !== id))}
              />
            ) : null}
            {stage === "deliver" ? (
              <ThermalDeliverables sessionId="preview" brandingConfig={{} as never} />
            ) : null}
          </StudioWorkspaceShell>
        </div>
      </div>
    </div>
  );
}
