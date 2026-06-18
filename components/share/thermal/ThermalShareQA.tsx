"use client";

import { useCallback, useEffect, useState } from "react";

type Question = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  created_at: string;
};

/** Stakeholder question form + thread (questions and owner replies) on a share. */
export function ThermalShareQA({ token }: { token: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/share/thermal/${token}/questions`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => setQuestions((json?.questions ?? []) as Question[]))
      .catch(() => {});
  }, [token]);

  useEffect(() => load(), [load]);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/share/thermal/${token}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim(), authorName: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setText("");
      setNotice("Sent — the inspector has been notified and can reply here.");
      load();
    } catch {
      setNotice("Could not send your question. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--mobile-app-card-border)] p-4">
      <h2 className="text-sm font-semibold text-[var(--graphite-text-header)]">Questions for the inspector</h2>
      <p className="mt-1 text-xs text-[var(--graphite-muted)]">
        Ask about any finding — your question goes to the inspector, and replies appear here.
      </p>

      {questions.length ? (
        <ul className="mt-3 space-y-2">
          {questions.map((qn) => (
            <li
              key={qn.id}
              className={`rounded-lg border p-2 text-xs ${
                qn.is_owner_reply
                  ? "ml-6 border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
                  : "border-[var(--mobile-app-card-border)]"
              }`}
            >
              <p className="font-semibold text-[var(--graphite-text-header)]">
                {qn.is_owner_reply ? "Inspector" : qn.author_name || "Stakeholder"}
              </p>
              <p className="mt-0.5 text-[var(--graphite-text-body)]">{qn.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--graphite-text-body)]"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Type your question…"
          className="rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--graphite-text-body)]"
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="rounded-full bg-[var(--graphite-primary)] px-4 py-1.5 text-sm font-semibold text-[#0B0F15] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send question"}
        </button>
        {notice ? <span className="text-xs text-[var(--graphite-muted)]">{notice}</span> : null}
      </div>
    </section>
  );
}
