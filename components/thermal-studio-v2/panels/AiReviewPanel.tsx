"use client";

import { useState } from "react";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { AnalyzeCaptureStrip } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCaptureStrip";
import { AiReviewList } from "@/components/thermal-studio-v2/panels/ai-review/AiReviewList";
import { AiReviewViewer } from "@/components/thermal-studio-v2/panels/ai-review/AiReviewViewer";
import { AiReviewFindings } from "@/components/thermal-studio-v2/panels/ai-review/AiReviewFindings";
import { AnalystChatToggleRail } from "@/components/thermal-studio-v2/panels/shared/AnalystChatToggleRail";
import { useFindingsReview } from "@/components/thermal-studio-v2/lib/useFindingsReview";
import { useUnitPreference } from "@/components/thermal-studio-v2/lib/useUnitPreference";
import { dispatchInterpret } from "@/components/thermal-studio-v2/lib/interpret-api";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture, ThermalV2Scope } from "@/components/thermal-studio-v2/types";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

/** Tab 3 — AI Review (doc §1): AI proposes, the operator decides (S6). */
export function AiReviewPanel({
  sessionId,
  captures,
  selection,
  scope,
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  selection: ReturnType<typeof useLibrarySelection>;
  scope: ThermalV2Scope;
}) {
  const [filter, setFilter] = useState<"all" | "action" | "watch" | "info">("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // Audit remediation Batch 3: this used to be its own bespoke one-shot
  // localStorage read, separate from AnalyzePanel's useUnitPreference() —
  // two implementations of "the" unit preference could drift.
  const { unit } = useUnitPreference();
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const withFindings = captures.filter((c) => (c.anomalies?.length ?? 0) > 0);
  const activeId = selection.focusedId && withFindings.some((c) => c.id === selection.focusedId) ? selection.focusedId : (withFindings[0]?.id ?? null);
  const activeCapture = captures.find((c) => c.id === activeId) ?? null;
  const anomalies = (activeCapture?.anomalies ?? []) as ThermalAnomaly[];
  const review = useFindingsReview(activeCapture);

  function openCapture(id: string) {
    const index = captures.findIndex((c) => c.id === id);
    selection.click(id, index, {});
    setSelectedIndex(null);
  }

  const scopeIds =
    scope.kind === "all"
      ? withFindings.map((c) => c.id)
      : scope.kind === "selected"
        ? withFindings.filter((c) => selection.selectedIds.has(c.id)).map((c) => c.id)
        : activeId
          ? [activeId]
          : [];

  async function runAi() {
    if (!scopeIds.length || running) return;
    setRunning(true);
    setRunStatus("Running AI review…");
    const result = await dispatchInterpret(sessionId, scopeIds);
    setRunStatus(result.message);
    setRunning(false);
  }

  return (
    <V2PanelFrame
      left={{
        title: "Detections",
        content: (
          <div className="flex h-full flex-col gap-2">
            <button
              type="button"
              disabled={!scopeIds.length || running}
              onClick={() => void runAi()}
              title="Have AI write explanations for the detections already found"
              className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-left text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run AI on {scopeIds.length}
              <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">Explains detections already found by Decode + Analyze</div>
            </button>
            {runStatus ? <span className="text-[10px] text-[var(--graphite-muted)]">{runStatus}</span> : null}
            <div className="min-h-0 flex-1">
              <AiReviewList captures={withFindings} activeId={activeId} onOpen={openCapture} filter={filter} onFilterChange={setFilter} />
            </div>
          </div>
        ),
      }}
      center={<AiReviewViewer captureId={activeId} anomalies={anomalies} selectedIndex={selectedIndex} onSelectIndex={setSelectedIndex} />}
      right={{
        title: "Findings",
        content: (
          <AnalystChatToggleRail
            sessionId={sessionId}
            captureId={activeId}
            onAcceptProposal={(index, note) => {
              review.setEdit(index, note);
              review.accept(index);
            }}
          >
            <AiReviewFindings anomalies={anomalies} unit={unit} selectedIndex={selectedIndex} onSelectIndex={setSelectedIndex} review={review} />
          </AnalystChatToggleRail>
        ),
      }}
      bottom={{
        title: "Filmstrip",
        compact: true,
        defaultSize: 20,
        content: (
          <AnalyzeCaptureStrip
            captures={withFindings}
            activeId={activeId}
            selectedIds={selection.selectedIds}
            onOpen={openCapture}
            onToggleSelect={(id) => selection.click(id, captures.findIndex((c) => c.id === id), { toggle: true })}
            layout="horizontal"
          />
        ),
      }}
    />
  );
}
