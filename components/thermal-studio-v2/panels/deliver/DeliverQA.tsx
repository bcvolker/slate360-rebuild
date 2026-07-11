"use client";

import { useEffect, useState } from "react";
import { listQuestions, replyToQuestion, type ThermalQuestion } from "@/components/thermal-studio-v2/lib/deliver-api";

/** Q&A inbox — client questions with inline replies (doc §1, Tab 5; feeds Ops/Coordination). */
export function DeliverQA({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<ThermalQuestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function refresh() {
    void listQuestions(sessionId).then(setQuestions);
  }
  useEffect(refresh, [sessionId]);

  const threads = questions.filter((q) => !q.is_owner_reply && !q.parent_id);

  async function send(parentId: string) {
    const text = (drafts[parentId] ?? "").trim();
    if (!text) return;
    if (await replyToQuestion(sessionId, parentId, text)) {
      setDrafts((d) => ({ ...d, [parentId]: "" }));
      refresh();
    }
  }

  if (!threads.length) {
    return <p className="p-2 text-xs text-[var(--graphite-muted)]">No client questions yet.</p>;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {threads.map((q) => {
        const replies = questions.filter((r) => r.parent_id === q.id);
        return (
          <div key={q.id} className="flex flex-col gap-2 rounded-md border border-[var(--mobile-app-card-border)] p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--graphite-text-header)]">{q.author_name ?? "Client"}</span>
              <span className={q.status === "answered" ? "text-[var(--graphite-muted)]" : "text-[var(--graphite-primary)]"}>{q.status}</span>
            </div>
            <p className="text-[var(--graphite-text-header)]">{q.body}</p>
            {replies.map((r) => (
              <p key={r.id} className="ml-3 border-l-2 border-[var(--mobile-app-card-border)] pl-2 text-[var(--graphite-muted)]">
                {r.body}
              </p>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={drafts[q.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                placeholder="Reply…"
                className="min-w-0 flex-1 rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
              />
              <button
                type="button"
                onClick={() => void send(q.id)}
                className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
              >
                Send
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
