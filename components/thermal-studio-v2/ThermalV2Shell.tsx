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
import { dispatchThermalJob, uploadThermalFile } from "@/components/thermal-studio-v2/lib/api";
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
  initialTab,
}: {
  sessionId: string;
  sessionName: string;
  captures: ThermalV2Capture[];
  /** TS-SD re-open deep link (?report=1) jumps straight to a tab on load. */
  initialTab?: ThermalV2Tab;
}) {
  const [tab, setTab] = useState<ThermalV2Tab>(initialTab ?? "library");
  const [scope, setScope] = useState<ThermalV2Scope>({ kind: "image" });
  const [dropUpload, setDropUpload] = useState<{ done: number; total: number } | null>(null);
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

  // W1 drop-anywhere: dropping files ANYWHERE in Thermal Studio imports them
  // (not just the Library rail's own dropzone) — switches to Library and
  // shows upload progress as a top-bar chip.
  useEffect(() => {
    function isFileDrag(e: DragEvent) {
      return Boolean(e.dataTransfer?.types.includes("Files"));
    }
    function onDragOver(e: DragEvent) {
      if (!isFileDrag(e)) return;
      e.preventDefault();
    }
    async function onDrop(e: DragEvent) {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      setTab("library");
      setDropUpload({ done: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        await uploadThermalFile(sessionId, files[i]);
        setDropUpload({ done: i + 1, total: files.length });
      }
      setTimeout(() => setDropUpload(null), 2000);
    }
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [sessionId]);

  function openInAnalyze(id: string, index: number) {
    selection.click(id, index, {});
    setTab("analyze");
  }

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
          {dropUpload ? (
            <span className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]">
              Uploading {dropUpload.done}/{dropUpload.total}…
            </span>
          ) : null}
        </>
      }
    >
      {tab === "library" ? (
        <LibraryPanel
          sessionId={sessionId}
          captures={captures}
          scope={liveScope}
          selection={selection}
          onOpenInAnalyze={openInAnalyze}
        />
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
      {tab === "ai-review" ? (
        <AiReviewPanel sessionId={sessionId} captures={captures} selection={selection} scope={liveScope} />
      ) : null}
      {tab === "report" ? <ReportPanel sessionId={sessionId} captures={captures} selection={selection} /> : null}
      {tab === "deliver" ? <DeliverPanel sessionId={sessionId} /> : null}
    </StudioWorkspaceShell>
  );
}
