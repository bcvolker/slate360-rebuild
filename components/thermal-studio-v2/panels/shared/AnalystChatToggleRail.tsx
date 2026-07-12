"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnalystChatDrawer } from "@/components/thermal-studio-v2/panels/shared/AnalystChatDrawer";

/**
 * S6.6 Analyst chat toggle — swaps an existing right rail's content between
 * its normal view and the chat drawer (one button), reused by AI Review and
 * Analyze (doc §C5: "available in AI Review and Analyze"). Deliberately NOT
 * a 5th V2PanelFrame slot — inherits the rail's own collapse-to-pill.
 */
export function AnalystChatToggleRail({
  sessionId,
  captureId,
  onAcceptProposal,
  children,
}: {
  sessionId: string;
  captureId: string | null;
  onAcceptProposal: (anomalyIndex: number, note: string) => void;
  children: ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  // Audit remediation Batch 3: Escape used to fall through to the shell's
  // global cascade without closing the chat drawer first.
  useEffect(() => {
    if (!chatOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setChatOpen(false);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [chatOpen]);

  return (
    <div className="flex h-full flex-col gap-2">
      <button
        type="button"
        onClick={() => setChatOpen((v) => !v)}
        className="self-start rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
      >
        {chatOpen ? "← Back" : "💬 Ask the analyst"}
      </button>
      <div className="min-h-0 flex-1 overflow-hidden">
        {chatOpen ? <AnalystChatDrawer sessionId={sessionId} captureId={captureId} onAcceptProposal={onAcceptProposal} /> : children}
      </div>
    </div>
  );
}
