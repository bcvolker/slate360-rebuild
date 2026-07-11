"use client";

import { useEffect, useState } from "react";
import { fetchAnalystChatThread, sendAnalystChatMessage } from "@/components/thermal-studio-v2/lib/chat-api";
import type { ThermalV2ChatMessage } from "@/components/thermal-studio-v2/types";

/** S6.6 Analyst chat: thread state for one (session, capture) pair — hydrates on open, appends locally on send. */
export function useAnalystChat(sessionId: string, captureId: string | null) {
  const [thread, setThread] = useState<ThermalV2ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedProposals, setDismissedProposals] = useState<Set<number>>(new Set());

  useEffect(() => {
    setThread([]);
    setError(null);
    setDismissedProposals(new Set());
    if (!captureId) return;
    setLoading(true);
    let cancelled = false;
    void fetchAnalystChatThread(sessionId, captureId).then((rows) => {
      if (!cancelled) {
        setThread(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, captureId]);

  async function send(message: string) {
    if (!captureId || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    const now = new Date().toISOString();
    setThread((prev) => [...prev, { role: "user", content: message.trim(), capture_id: captureId, at: now }]);
    const result = await sendAnalystChatMessage(sessionId, captureId, message.trim());
    if ("error" in result) {
      setError(result.error);
    } else {
      setThread((prev) => [...prev, { role: "assistant", content: result.reply, capture_id: captureId, at: new Date().toISOString(), proposal: result.proposal }]);
    }
    setSending(false);
  }

  function dismissProposal(anomalyIndex: number) {
    setDismissedProposals((prev) => new Set(prev).add(anomalyIndex));
  }

  return { thread, loading, sending, error, send, dismissedProposals, dismissProposal };
}
