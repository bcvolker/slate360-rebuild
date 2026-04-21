"use client";

import { useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ViewerComment } from "@/lib/site-walk/viewer-types";

interface Props {
  deliverableId: string;
  itemId: string;
  token: string;
}

export default function CommentThread({ deliverableId, itemId, token }: Props) {
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/view/${token}/comments?itemId=${encodeURIComponent(itemId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setComments(Array.isArray(data?.comments) ? data.comments : []);
      })
      .catch(() => !cancelled && setError("Could not load comments."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [itemId, token]);

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
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
        Questions &amp; Comments ({comments.length})
      </h3>

      <form
        onSubmit={submit}
        className="flex flex-col gap-2 bg-black/40 p-3 rounded-lg border border-white/5"
      >
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-transparent text-sm text-white placeholder-slate-500 outline-none border-b border-white/10 pb-1.5 focus:border-cobalt transition-colors"
          required
          maxLength={120}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent text-sm text-white placeholder-slate-500 outline-none border-b border-white/10 pb-1.5 focus:border-cobalt transition-colors"
        />
        <div className="flex items-end gap-2 pt-1">
          <textarea
            placeholder="Ask a question or leave a note…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none min-h-[40px] max-h-[120px]"
            required
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={submitting || !body.trim() || !name.trim()}
            className="text-cobalt hover:text-white disabled:opacity-40 p-2 transition-colors"
            aria-label="Send comment"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-500">
            No comments yet. Be the first to leave one.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium text-cobalt">{c.author_name}</span>
                <span className="text-[10px] text-slate-500">
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
