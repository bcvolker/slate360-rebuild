"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, ThumbsUp, AlertTriangle, HelpCircle, MessageSquare, CheckCircle2 } from "lucide-react";
import type { ViewerComment } from "@/lib/site-walk/viewer-types";

interface Props {
  deliverableId: string;
  itemId: string;
  token: string;
}

type Intent = "approve" | "needs_change" | "question" | "comment";

const INTENT_META: Record<Intent, { label: string; icon: typeof ThumbsUp; tone: string; defaultBody: string }> = {
  approve: {
    label: "Approve",
    icon: ThumbsUp,
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25",
    defaultBody: "Approved.",
  },
  needs_change: {
    label: "Needs change",
    icon: AlertTriangle,
    tone: "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25",
    defaultBody: "Needs change: ",
  },
  question: {
    label: "Question",
    icon: HelpCircle,
    tone: "bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25",
    defaultBody: "Question: ",
  },
  comment: {
    label: "Comment",
    icon: MessageSquare,
    tone: "bg-slate-500/15 text-slate-300 border-slate-500/40 hover:bg-slate-500/25",
    defaultBody: "",
  },
};

function intentBadge(intent: ViewerComment["comment_intent"]) {
  if (!intent || intent === "comment") return null;
  const meta = INTENT_META[intent];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${meta.tone}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}

export default function CommentThread({ deliverableId, itemId, token }: Props) {
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [intent, setIntent] = useState<Intent>("comment");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/view/${token}/comments?itemId=${encodeURIComponent(itemId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setComments(Array.isArray(data?.comments) ? data.comments : []);
        })
        .catch(() => !cancelled && setError("Could not load comments."))
        .finally(() => !cancelled && setLoading(false));
    };
    setLoading(true);
    setError(null);
    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [itemId, token]);

  function chooseIntent(next: Intent) {
    setIntent(next);
    if (!body.trim()) setBody(INTENT_META[next].defaultBody);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/view/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          deliverableId,
          name: name.trim(),
          email: email.trim() || undefined,
          body: body.trim(),
          intent,
          is_field: false,
          is_escalation: intent === "needs_change",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? "Could not post comment.");
        return;
      }
      const data = await res.json();
      if (data?.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setBody("");
        setIntent("comment");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
        Feedback ({comments.length})
        {comments.some((c) => c.comment_intent === "approve") && (
          <CheckCircle2 size={14} className="text-emerald-400" aria-label="Has approval" />
        )}
      </h3>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 bg-black/40 p-3 rounded-lg border border-white/5"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder-slate-500 outline-none border-b border-white/10 pb-1.5 focus:border-cobalt transition-colors"
            required
            maxLength={120}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder-slate-500 outline-none border-b border-white/10 pb-1.5 focus:border-cobalt transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(INTENT_META) as Intent[]).map((key) => {
            const meta = INTENT_META[key];
            const Icon = meta.icon;
            const active = intent === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => chooseIntent(key)}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  active ? meta.tone : "border-white/10 text-slate-400 hover:text-foreground hover:border-white/20"
                }`}
              >
                <Icon size={12} /> {meta.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            placeholder={
              intent === "approve"
                ? "Optional approval note…"
                : intent === "needs_change"
                ? "What needs to change?"
                : intent === "question"
                ? "Ask a question…"
                : "Leave a comment…"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder-slate-500 outline-none resize-none min-h-[40px] max-h-[120px]"
            required
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={submitting || !body.trim() || !name.trim()}
            className="text-cobalt hover:text-foreground disabled:opacity-40 p-2 transition-colors"
            aria-label="Send comment"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-500">
            No feedback yet. Be the first to approve, request a change, or ask a question.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex justify-between items-baseline mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-cobalt truncate">{c.author_name}</span>
                  {intentBadge(c.comment_intent)}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 bg-white/[0.03] p-2.5 rounded whitespace-pre-wrap">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
