"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalGlassCard } from "./PortalGlassCard";

type ThreadItem = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  created_at: string;
};

function fmt(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Public, token-gated two-way Q&A on a shared deliverable. Viewers ask questions;
 * the owner's replies appear inline. Mirrors the thermal share Q&A depth.
 */
export function DeliverableQnA({ token, orgName }: { token: string; orgName: string }) {
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/deliverable/${token}/questions`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { questions?: ThreadItem[] };
      if (res.ok) setThread(json.questions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const body = text.trim();
    if (!body) {
      setError("Type a question first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/deliverable/${token}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorName: name.trim() || undefined, authorEmail: email.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Couldn't send your question.");
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your question.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "min-h-10 w-full rounded-lg border border-[color-mix(in_srgb,var(--graphite-muted)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 text-sm text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)]";

  return (
    <PortalGlassCard className="!p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[var(--graphite-primary)]" aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--graphite-text-header)]">Questions &amp; answers</h2>
      </div>
      <p className="mt-1 text-xs text-[var(--graphite-muted)]">
        Ask {orgName || "the sender"} a question about this deliverable — replies appear here.
      </p>

      {loaded && thread.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {thread.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border p-3",
                item.is_owner_reply
                  ? "ml-6 border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--graphite-muted)_25%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_50%,transparent)]",
              )}
            >
              <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
                <span>
                  {item.is_owner_reply ? orgName || "Sender" : item.author_name || "You"}
                  {item.is_owner_reply ? " · reply" : ""}
                </span>
                <span className="font-normal normal-case">{fmt(item.created_at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--graphite-text-body)]">{item.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <input type="email" inputMode="email" placeholder="Your email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <textarea
          placeholder="Type your question…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={cn(input, "resize-none py-2 leading-relaxed")}
        />
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90",
              busy && "opacity-70",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {busy ? "Sending…" : "Send question"}
          </button>
        </div>
      </div>
    </PortalGlassCard>
  );
}
