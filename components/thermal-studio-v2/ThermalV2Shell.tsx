"use client";

import { useState } from "react";
import {
  StudioWorkspaceShell,
  StudioTabs,
  StudioChip,
  type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";
import { ScopePill } from "@/components/thermal-studio-v2/ScopePill";
import { LibraryPanel } from "@/components/thermal-studio-v2/panels/LibraryPanel";
import { AnalyzePanel } from "@/components/thermal-studio-v2/panels/AnalyzePanel";
import { AiReviewPanel } from "@/components/thermal-studio-v2/panels/AiReviewPanel";
import { ReportPanel } from "@/components/thermal-studio-v2/panels/ReportPanel";
import { DeliverPanel } from "@/components/thermal-studio-v2/panels/DeliverPanel";
import { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture, ThermalV2Scope, ThermalV2Tab } from "@/components/thermal-studio-v2/types";

const TABS: { id: ThermalV2Tab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "analyze", label: "Analyze" },
  { id: "ai-review", label: "AI Review" },
  { id: "report", label: "Report" },
  { id: "deliver", label: "Deliver" },
];

/**
 * Thermal Studio V2 shell (doc §1-2, slice S1). Thin top bar (title · 5 tabs ·
 * global Scope pill · status chips) over the per-tab resizable frame. Nothing
 * here touches /thermal-studio or components/ops/thermal/** — this is the
 * standalone V2 tree, reachable today only via /preview/thermal-v2.
 */
export function ThermalV2Shell({
  sessionId,
  sessionName,
  captures,
}: {
  sessionId: string;
  sessionName: string;
  captures: ThermalV2Capture[];
}) {
  const [tab, setTab] = useState<ThermalV2Tab>("library");
  const [scope, setScope] = useState<ThermalV2Scope>({ kind: "image" });
  const selection = useLibrarySelection(sessionId, captures);

  const selectedCount = selection.selectedIds.size;
  const totalCount = captures.length;

  function changeScope(kind: ThermalV2Scope["kind"]) {
    if (kind === "selected") setScope({ kind, count: selectedCount });
    else if (kind === "all") setScope({ kind, count: totalCount });
    else setScope({ kind: "image" });
  }

  // Keep an already-active Selected/All scope's count live as the selection changes.
  const liveScope: ThermalV2Scope =
    scope.kind === "selected" ? { kind: "selected", count: selectedCount } : scope.kind === "all" ? { kind: "all", count: totalCount } : scope;

  const tabs: StudioTab<ThermalV2Tab>[] = TABS;

  return (
    <StudioWorkspaceShell
      title="Thermal Studio"
      subtitle={sessionName}
      tabsSlot={<StudioTabs tabs={tabs} active={tab} onChange={setTab} />}
      rightSlot={
        <>
          <ScopePill scope={liveScope} selectedCount={selectedCount} totalCount={totalCount} onChange={changeScope} />
          <StudioChip label="Images" value={totalCount} />
          <span
            title="No processing job running"
            className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--graphite-muted)]" />
            Idle
          </span>
        </>
      }
    >
      {tab === "library" ? (
        <LibraryPanel sessionId={sessionId} captures={captures} scope={liveScope} selection={selection} />
      ) : null}
      {tab === "analyze" ? <AnalyzePanel /> : null}
      {tab === "ai-review" ? <AiReviewPanel /> : null}
      {tab === "report" ? <ReportPanel /> : null}
      {tab === "deliver" ? <DeliverPanel /> : null}
    </StudioWorkspaceShell>
  );
}
