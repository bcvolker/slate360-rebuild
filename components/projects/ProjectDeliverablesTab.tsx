"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Link2, MessageSquare, Play, Send, Check, Loader2, AlertTriangle, CornerDownRight } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { cn } from "@/lib/utils";
import type { ProjectDeliverablesTabData, ProjectDeliverableRow } from "@/lib/projects/load-project-deliverables-data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Friendly label + icon for the delivery mode (hosted link, slideshow, etc.). */
function modeMeta(outputMode: string, deliverableType: string): { label: string; icon: typeof FileText } {
  const m = `${outputMode} ${deliverableType}`.toLowerCase();
  if (m.includes("present") || m.includes("slide") || m.includes("cinematic")) return { label: "Slideshow", icon: Play };
  if (m.includes("portal") || m.includes("hosted") || m.includes("link")) return { label: "Shareable link", icon: Link2 };
  return { label: "Report", icon: FileText };
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s === "shared" || s === "sent") return "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]";
  if (s === "published") return "bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-text-body)]";
  return "bg-[color-mix(in_srgb,var(--graphite-muted)_14%,transparent)] text-[var(--graphite-muted)]";
}

export function ProjectDeliverablesTab({ data, canManage }: { data: ProjectDeliverablesTabData; canManage: boolean }) {
  const hasItems = data.deliverables.length > 0;
  const totalUnanswered = data.deliverables.reduce((sum, d) => sum + d.unansweredCount, 0);

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Deliverables</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">Reports, links &amp; presentations</h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--graphite-muted)]">
              Build a deliverable from a walk, then send it as a link over email or text — a PDF, a click-through
              slideshow, or an interactive viewer where clients can ask questions back.
            </p>
            {totalUnanswered > 0 ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--graphite-primary)]">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {totalUnanswered} question{totalUnanswered === 1 ? "" : "s"} waiting for a reply
              </p>
            ) : null}
          </div>
          {canManage ? (
            <Link href="/site-walk/deliverables/new" className={t.primaryButton}>
              <FileText className="mr-2 h-4 w-4" aria-hidden /> New deliverable
            </Link>
          ) : null}
        </div>
      </section>

      {!hasItems ? (
        <ProjectDetailEmptyState
          title="No deliverables yet"
          description="Finish a Site Walk, then build a report or shareable presentation. You'll be able to send a link by email or text and collect questions back."
          actionLabel={canManage ? "Go to walks" : undefined}
          actionHref={canManage ? `/projects/${data.projectId}/walks` : undefined}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.deliverables.map((d) => (
            <DeliverableCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliverableCard({ d }: { d: ProjectDeliverableRow }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [qnaOpen, setQnaOpen] = useState(false);
  const hasUnanswered = d.unansweredCount > 0;

  const mode = modeMeta(d.outputMode, d.deliverableType);
  const ModeIcon = mode.icon;
  const shareUrl = d.shareToken ? `/share/deliverable/${d.shareToken}` : null;

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function publishLink() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${d.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("Couldn't publish a link.");
      router.refresh();
    } catch (e) {
      setFeedback({ kind: "err", text: e instanceof Error ? e.message : "Couldn't publish a link." });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!email.trim() && !phone.trim()) {
      setFeedback({ kind: "err", text: "Enter an email or phone number." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/site-walk/deliverables/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: d.id,
          recipient_email: email.trim() || undefined,
          recipient_phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          mode: "link",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { channels?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed.");
      setFeedback({ kind: "ok", text: `Sent via ${(json.channels ?? ["link"]).join(" + ")}.` });
      setEmail("");
      setPhone("");
      setMessage("");
      setSendOpen(false);
    } catch (e) {
      setFeedback({ kind: "err", text: e instanceof Error ? e.message : "Send failed." });
    } finally {
      setBusy(false);
    }
  }

  const input = "min-h-9 w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 text-xs text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]";

  return (
    <div className={cn(t.sectionCard, "flex flex-col gap-3")}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]">
          <ModeIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{d.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--graphite-muted)]">
            <span className="rounded-md bg-[color-mix(in_srgb,var(--graphite-muted)_14%,transparent)] px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[10px]">{mode.label}</span>
            <span className={cn("rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[10px]", statusBadge(d.status))}>{d.status}</span>
            <span>· {formatDate(d.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {shareUrl ? (
          <>
            <Link href={shareUrl} target="_blank" rel="noopener noreferrer" className={cn(t.secondaryButton, "!min-h-9 !px-3 text-xs")}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Open
            </Link>
            <button type="button" onClick={copyLink} className={cn(t.secondaryButton, "!min-h-9 !px-3 text-xs")}>
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" onClick={() => { setSendOpen((v) => !v); setFeedback(null); }} className={cn(t.secondaryButton, "!min-h-9 !px-3 text-xs")}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Send
            </button>
            <button
              type="button"
              onClick={() => setQnaOpen((v) => !v)}
              className={cn(
                t.secondaryButton,
                "!min-h-9 !px-3 text-xs",
                hasUnanswered && "!border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] !text-[var(--graphite-primary)]",
              )}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Q&amp;A
              {hasUnanswered ? (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-[var(--graphite-primary)] px-1 text-[10px] font-bold leading-none text-[var(--graphite-canvas)]">
                  {d.unansweredCount}
                </span>
              ) : null}
            </button>
          </>
        ) : (
          <button type="button" onClick={publishLink} disabled={busy} className={cn(t.secondaryButton, "!min-h-9 !px-3 text-xs")}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
            Publish link
          </button>
        )}
      </div>

      {sendOpen && shareUrl ? (
        <div className="space-y-2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Send by email or text</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="email" inputMode="email" placeholder="recipient@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            <input type="tel" inputMode="tel" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
          <input type="text" placeholder="Optional message (email only)" value={message} onChange={(e) => setMessage(e.target.value)} className={input} />
          <div className="flex justify-end">
            <button type="button" onClick={send} disabled={busy} className={cn(t.primaryButton, "!min-h-9 !px-4 text-xs", busy && "opacity-70")}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
              {busy ? "Sending…" : "Send link"}
            </button>
          </div>
        </div>
      ) : null}

      {qnaOpen && shareUrl ? <OwnerQnAPanel deliverableId={d.id} /> : null}

      {feedback ? (
        <p className={cn("flex items-center gap-1.5 text-xs", feedback.kind === "ok" ? "text-[var(--graphite-primary)]" : "text-red-300")}>
          {feedback.kind === "ok" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}

type QnAItem = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  status?: string;
  created_at: string;
};

function fmtTime(value: string): string {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Owner-side thread: loads viewer questions and lets the owner reply to each. */
function OwnerQnAPanel({ deliverableId }: { deliverableId: string }) {
  const [items, setItems] = useState<QnAItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/site-walk/deliverables/${deliverableId}/questions`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { questions?: QnAItem[] };
      if (res.ok) setItems(json.questions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, [deliverableId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply(parentId: string | null) {
    const body = replyText.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${deliverableId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId: parentId ?? undefined }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Couldn't send reply.");
      }
      setReplyText("");
      setReplyTo(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send reply.");
    } finally {
      setBusy(false);
    }
  }

  const input = "min-h-9 w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-2 text-xs text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]";

  return (
    <div className="space-y-2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Questions from viewers
      </p>

      {!loaded ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--graphite-muted)]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-[var(--graphite-muted)]">No questions yet. When a viewer asks something on the shared link, it shows up here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((q) => (
            <li
              key={q.id}
              className={cn(
                "rounded-lg border p-2.5 text-xs",
                q.is_owner_reply
                  ? "ml-5 border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
                  : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_45%,transparent)]",
              )}
            >
              <p className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
                <span>{q.is_owner_reply ? "Your reply" : q.author_name || "Viewer"}</span>
                <span className="font-normal normal-case">{fmtTime(q.created_at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--graphite-text-body)]">{q.body}</p>
              {!q.is_owner_reply ? (
                replyTo === q.id ? (
                  <div className="mt-2 space-y-1.5">
                    <textarea autoFocus rows={2} placeholder="Write a reply…" value={replyText} onChange={(e) => setReplyText(e.target.value)} className={cn(input, "resize-none")} />
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => { setReplyTo(null); setReplyText(""); }} className={cn(t.secondaryButton, "!min-h-8 !px-2.5 text-[11px]")}>Cancel</button>
                      <button type="button" onClick={() => sendReply(q.id)} disabled={busy} className={cn(t.primaryButton, "!min-h-8 !px-3 text-[11px]", busy && "opacity-70")}>
                        {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden /> : <Send className="mr-1 h-3 w-3" aria-hidden />} Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setReplyTo(q.id); setReplyText(""); setError(null); }} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--graphite-primary)] hover:underline">
                    <CornerDownRight className="h-3 w-3" aria-hidden /> Reply
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="flex items-center gap-1.5 text-xs text-red-300"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {error}</p> : null}
    </div>
  );
}
