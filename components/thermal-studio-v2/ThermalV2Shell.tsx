"use client";

import { useEffect, useRef, useState } from "react";
import {
  StudioWorkspaceShell,
  StudioTabs,
  StudioChip,
  type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";
import { ScopePill } from "@/components/thermal-studio-v2/ScopePill";
import { SavedStatusChip } from "@/components/thermal-studio-v2/SavedStatusChip";
import { JobStatusChip } from "@/components/thermal-studio-v2/JobStatusChip";
import { LibraryPanel } from "@/components/thermal-studio-v2/panels/LibraryPanel";
import { AnalyzePanel } from "@/components/thermal-studio-v2/panels/AnalyzePanel";
import { AiReviewPanel } from "@/components/thermal-studio-v2/panels/AiReviewPanel";
import { ReportPanel } from "@/components/thermal-studio-v2/panels/ReportPanel";
import { DeliverPanel } from "@/components/thermal-studio-v2/panels/DeliverPanel";
import { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import { dispatchThermalJob } from "@/components/thermal-studio-v2/lib/api";
import { hasUnsavedWork } from "@/components/thermal-studio-v2/lib/save-status";
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

  // R1: never navigate away from unsaved/errored work silently.
  useEffect(() => {
    function guard(e: BeforeUnloadEvent) {
      if (!hasUnsavedWork()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  function retryJob(jobType: string, failedCaptureIds: string[]) {
    if (!failedCaptureIds.length) return;
    void dispatchThermalJob(sessionId, jobType as "extract" | "extract_analyze" | "align" | "analyze" | "report" | "full_pipeline", failedCaptureIds);
  }

  // W3 Esc-cascade: innermost first. The active tab can register a handler
  // (e.g. Analyze clearing a selected measurement); only when that handler
  // is absent or reports it had nothing to clear does Escape fall through to
  // resetting the global Scope pill back to "This image".
  const analyzeEscapeRef = useRef<(() => boolean) | null>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const consumed = analyzeEscapeRef.current?.() ?? false;
      if (!consumed && scope.kind !== "image") changeScope("image");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.kind]);

  return (
    <StudioWorkspaceShell
      title="Thermal Studio"
      subtitle={sessionName}
      bare
      tabsSlot={<StudioTabs tabs={tabs} active={tab} onChange={setTab} />}
      rightSlot={
        <>
          <ScopePill scope={liveScope} selectedCount={selectedCount} totalCount={totalCount} onChange={changeScope} />
          <StudioChip label="Images" value={totalCount} />
          <SavedStatusChip />
          <JobStatusChip sessionId={sessionId} onRetry={retryJob} />
        </>
      }
    >
      {tab === "library" ? (
        <LibraryPanel sessionId={sessionId} captures={captures} scope={liveScope} selection={selection} />
      ) : null}
      {tab === "analyze" ? (
        <AnalyzePanel
          captures={captures}
          selection={selection}
          scope={liveScope}
          registerEscapeHandler={(fn) => {
            analyzeEscapeRef.current = fn;
          }}
        />
      ) : null}
      {tab === "ai-review" ? <AiReviewPanel /> : null}
      {tab === "report" ? <ReportPanel /> : null}
      {tab === "deliver" ? <DeliverPanel /> : null}
    </StudioWorkspaceShell>
  );
}
