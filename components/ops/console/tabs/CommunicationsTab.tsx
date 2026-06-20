"use client";

import { useEffect, useState } from "react";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

type CommItem = {
  id: string;
  kind: "thermal";
  sessionId: string;
  sessionName: string;
  captureId: string | null;
  author: string;
  body: string;
  status: string;
  createdAt: string;
};

/**
 * Communications inbox — stakeholder questions from interactive thermal share links,
 * aggregated across sessions. Reply inline (posts an owner reply + marks answered).
 */
export function CommunicationsTab() {
  const [items, setItems] = useState<CommItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/communications");
      const json = await res.json();
      setItems((json.data?.items ?? json.items ?? []) as CommItem[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const isOpen = (s: string) => s !== "answered" && s !== "resolved";
  const visible = filter === "open" ? items.filter((i) => isOpen(i.status)) : items;
  const openCount = items.filter((i) => isOpen(i.status)).length;

  async function sendReply(item: CommItem) {
    const text = replyText.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${item.sessionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId: item.id }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "answered" } : i)));
        setReplyFor(null);
        setReplyText("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function markResolved(item: CommItem) {
    setBusy(true);
    try {
      await fetch(`/api/ops/thermal/sessions/${item.sessionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", parentId: item.id }),
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "resolved" } : i)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={t.eyebrow}>Communications · {openCount} open</p>
            <p className="mt-1 text-xs text-[var(--graphite-muted)]">
              Questions from interactive thermal share links. Reply here and the stakeholder sees it in the viewer.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--mobile-app-card-border)] p-0.5 text-xs">
            {(["open", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-2.5 py-1 font-semibold capitalize ${
                  filter === f
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--graphite-muted)]">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--graphite-muted)]">
            {filter === "open" ? "No open questions — you're all caught up." : "No questions yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{item.author}</p>
                    <p className="text-[11px] text-[var(--graphite-muted)]">
                      {item.sessionName} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={isOpen(item.status) ? t.badgeInfo : t.badgeMuted}>{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--graphite-text-body)]">{item.body}</p>

                {replyFor === item.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      placeholder="Type your reply…"
                      className="block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-2 text-sm text-[var(--graphite-text-header)] outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button type="button" className={t.primaryButton} disabled={busy || !replyText.trim()} onClick={() => sendReply(item)}>
                        {busy ? "Sending…" : "Send reply"}
                      </button>
                      <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => { setReplyFor(null); setReplyText(""); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button type="button" className="text-xs font-semibold text-[var(--graphite-primary)] hover:underline" onClick={() => { setReplyFor(item.id); setReplyText(""); }}>
                      Reply
                    </button>
                    {isOpen(item.status) ? (
                      <button type="button" className="text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]" disabled={busy} onClick={() => markResolved(item)}>
                        Mark resolved
                      </button>
                    ) : null}
                    <a href={`/thermal-studio/${item.sessionId}`} className="text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
                      Open session →
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
