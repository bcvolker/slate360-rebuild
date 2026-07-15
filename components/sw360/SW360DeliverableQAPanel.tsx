"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";

type Question = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  status: string;
  created_at: string;
};

/**
 * Two-way Q&A: viewers already reach the org through
 * POST /api/share/deliverable/[token]/questions (token-gated, no auth) — this
 * panel is the other half, reusing the existing authenticated
 * GET/POST /api/site-walk/deliverables/[id]/questions route (which already
 * worked but had zero UI callers anywhere in the app) so an org member can
 * actually read and reply to what a stakeholder said, from inside SW360.
 */
export function SW360DeliverableQAPanel({
  deliverableId,
  onClose,
}: {
  deliverableId: string;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/site-walk/deliverables/${deliverableId}/questions`)
      .then((res) => res.json())
      .then((body: { questions?: Question[] }) => {
        if (!cancelled) setQuestions(body.questions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the conversation.");
      });
    return () => {
      cancelled = true;
    };
  }, [deliverableId]);

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${deliverableId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim(), parentId: replyTo }),
      });
      if (!res.ok) throw new Error("Couldn't send the reply.");
      const body = (await res.json()) as { question: Question };
      setQuestions((prev) => [...(prev ?? []), body.question]);
      setReply("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--sw360-bone)] p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
            <MessageCircle size={16} /> Conversation
          </p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} className="text-[var(--sw360-charcoal)]/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {questions === null ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[var(--sw360-charcoal)]/40" />
            </div>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--sw360-charcoal)]/60">No messages yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={
                    q.is_owner_reply
                      ? "ml-8 rounded-xl bg-[var(--sw360-green-light)]/10 px-3 py-2"
                      : "mr-8 rounded-xl bg-[var(--sw360-silver)]/40 px-3 py-2"
                  }
                >
                  <p className="text-xs font-bold text-[var(--sw360-charcoal)]/60">
                    {q.is_owner_reply ? "You" : q.author_name ?? "Stakeholder"}
                  </p>
                  <p className="text-sm text-[var(--sw360-charcoal)]">{q.body}</p>
                  {!q.is_owner_reply ? (
                    <button
                      type="button"
                      onClick={() => setReplyTo(q.id)}
                      className="mt-1 text-xs font-bold text-[var(--sw360-green-light)]"
                    >
                      Reply
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="mt-2 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}

        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          {replyTo ? (
            <div className="flex items-center justify-between text-xs text-[var(--sw360-charcoal)]/60">
              <span>Replying to a message</span>
              <button type="button" onClick={() => setReplyTo(null)} className="font-bold">
                Cancel
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              className="min-h-[44px] flex-1 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
            />
            <button
              type="button"
              disabled={sending || !reply.trim()}
              onClick={() => void sendReply()}
              className="flex min-h-[44px] items-center rounded-lg bg-[var(--sw360-green-light)] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
