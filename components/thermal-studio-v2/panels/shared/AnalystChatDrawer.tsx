"use client";

import { useState } from "react";
import { useAnalystChat } from "@/components/thermal-studio-v2/lib/useAnalystChat";
import type { ThermalV2ChatMessage } from "@/components/thermal-studio-v2/types";

/**
 * S6.6 Analyst chat (doc §C5) — grounded Q&A over the active image's findings.
 * Renders as the content of an existing right-rail slot (toggled by the
 * caller), not a 5th independent panel — inherits that rail's collapse-to-
 * pill behavior for free, matching "drawer never overlays the viewer".
 * Drag-drop PDF/image grounding is scoped down (see build log) — text-only.
 */
export function AnalystChatDrawer({
  sessionId,
  captureId,
  onAcceptProposal,
}: {
  sessionId: string;
  captureId: string | null;
  onAcceptProposal: (anomalyIndex: number, note: string) => void;
}) {
  const { thread, loading, sending, error, send, dismissedProposals, dismissProposal } = useAnalystChat(sessionId, captureId);
  const [draft, setDraft] = useState("");

  function handleSend() {
    if (!draft.trim()) return;
    void send(draft);
    setDraft("");
  }

  if (!captureId) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">Open an image to ask the analyst about its findings.</div>;
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? <p className="text-xs text-[var(--graphite-muted)]">Loading thread…</p> : null}
        {!loading && thread.length === 0 ? (
          <p className="text-xs text-[var(--graphite-muted)]">
            Ask a question about this image&apos;s findings, or correct one ("finding 2 is a sun-warmed junction box, not moisture").
          </p>
        ) : null}
        {thread.map((m, i) => (
          <ChatBubble key={i} message={m} dismissed={m.proposal ? dismissedProposals.has(m.proposal.anomaly_index) : false} onAccept={onAcceptProposal} onDismiss={dismissProposal} />
        ))}
        {sending ? <p className="text-xs text-[var(--graphite-muted)]">Analyst is thinking…</p> : null}
        {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-1.5 border-t border-[var(--mobile-app-card-border)] pt-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask the analyst…"
          className="min-w-0 flex-1 rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={handleSend}
          className="rounded-md border border-[var(--mobile-app-card-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  dismissed,
  onAccept,
  onDismiss,
}: {
  message: ThermalV2ChatMessage;
  dismissed: boolean;
  onAccept: (anomalyIndex: number, note: string) => void;
  onDismiss: (anomalyIndex: number) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-md px-2.5 py-1.5 text-xs ${
          isUser ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "border border-[var(--mobile-app-card-border)] text-[var(--graphite-text-header)]"
        }`}
      >
        {message.content}
      </div>
      {message.proposal && !dismissed ? (
        <div className="mt-1 flex max-w-[90%] flex-col gap-1.5 rounded-md border border-[var(--graphite-primary)] p-2 text-xs">
          <span className="font-semibold text-[var(--graphite-text-header)]">Proposed revision — finding {message.proposal.anomaly_index + 1}</span>
          <span className="text-[var(--graphite-muted)]">{message.proposal.note}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAccept(message.proposal!.anomaly_index, message.proposal!.note)}
              className="rounded-md border border-[var(--graphite-primary)] px-2 py-1 font-semibold text-[var(--graphite-text-header)]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDismiss(message.proposal!.anomaly_index)}
              className="text-[var(--graphite-muted)] hover:text-red-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
