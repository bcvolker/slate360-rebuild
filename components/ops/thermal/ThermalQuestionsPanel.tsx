"use client";

import { useCallback, useEffect, useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Question = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  status: string;
  created_at: string;
};

/** CEO view of stakeholder questions on a session's shares, with inline replies. */
export function ThermalQuestionsPanel({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/ops/thermal/sessions/${sessionId}/questions`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => setQuestions((json?.data?.questions ?? json?.questions ?? []) as Question[]))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => load(), [load]);

  async function sendReply(parentId: string) {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/ops/thermal/sessions/${sessionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim(), parentId }),
      });
      setReplyText("");
      setReplyTo(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  const threads = questions.filter((q) => !q.is_owner_reply);
  const repliesFor = (id: string) => questions.filter((q) => q.is_owner_reply && q.parent_id === id);
  const newCount = threads.filter((q) => q.status === "new").length;

  return (
    <div className={t.card}>
      <div className="flex items-center justify-between">
        <p className={t.eyebrow}>Stakeholder questions</p>
        {newCount ? (
          <span className="rounded-full bg-[#fb923c] px-2 py-0.5 text-[10px] font-bold text-black">{newCount} new</span>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--graphite-muted)]">
          No questions yet. When someone asks a question from a share link, it appears here and you&apos;re emailed.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {threads.map((qn) => (
            <li key={qn.id} className="rounded-xl border border-[var(--mobile-app-card-border)] p-2">
              <p className="text-xs font-semibold text-[var(--graphite-text-header)]">{qn.author_name || "Stakeholder"}</p>
              <p className="mt-0.5 text-xs text-[var(--graphite-text-body)]">{qn.body}</p>
              {repliesFor(qn.id).map((r) => (
                <p key={r.id} className="mt-1 rounded bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] p-1.5 text-xs text-[var(--graphite-text-body)]">
                  <span className="font-semibold text-[var(--graphite-text-header)]">You: </span>
                  {r.body}
                </p>
              ))}
              {replyTo === qn.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(qn.id); }}
                    placeholder="Type your reply…"
                    className="flex-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-body)]"
                  />
                  <button type="button" disabled={busy} onClick={() => sendReply(qn.id)} className="rounded-lg bg-[var(--graphite-primary)] px-2 py-1 text-xs font-semibold text-[#0B0F15] disabled:opacity-50">
                    Send
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => { setReplyTo(qn.id); setReplyText(""); }} className="mt-1.5 text-[11px] font-semibold text-[var(--graphite-primary)] hover:underline">
                  Reply
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
