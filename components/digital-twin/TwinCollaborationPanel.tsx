"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type Comment = {
  id: string;
  body: string;
  parent_id: string | null;
  author_display: string | null;
  author_user_id: string | null;
  share_token_id: string | null;
  subject_type: string;
  created_at: string;
};

type Pin = {
  id: string;
  title: string;
  body: string | null;
  pin_status: string;
  created_at: string;
};

const PIN_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export function TwinCollaborationPanel({
  spaceId,
  onCountsChange,
  compact = false,
}: {
  spaceId: string;
  onCountsChange?: (count: number) => void;
  compact?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/digital-twin/collaboration?space_id=${spaceId}`);
    const data = (await res.json().catch(() => ({}))) as {
      comments?: Comment[];
      pins?: Pin[];
      unread_count?: number;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not load collaboration");
      return;
    }
    const nextComments = data.comments ?? [];
    const nextPins = data.pins ?? [];
    setComments(nextComments);
    setPins(nextPins);
    setUnreadCount(data.unread_count ?? 0);
    setError(null);
    onCountsChange?.(
      nextComments.filter((c) => c.share_token_id && c.subject_type !== "pin").length + nextPins.length,
    );
  }, [spaceId, onCountsChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const shareComments = useMemo(
    () => comments.filter((c) => c.share_token_id && c.subject_type !== "pin"),
    [comments],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [comments]);

  const submitReply = async () => {
    if (!replyBody.trim() || !replyTo) return;
    setBusy(true);
    try {
      const res = await fetch("/api/digital-twin/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space_id: spaceId,
          body: replyBody.trim(),
          parent_id: replyTo,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reply failed");
      setReplyBody("");
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  };

  const updatePinStatus = async (pinId: string, pinStatus: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/digital-twin/collaboration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin_id: pinId, pin_status: pinStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(compact ? "p-0" : "rounded-xl border border-white/[0.08] bg-white/[0.03] p-3")}>
      {!compact ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn("size-4", twinAccent.text)} aria-hidden />
            <h2 className="text-sm font-semibold text-zinc-100">Collaboration</h2>
          </div>
          {unreadCount > 0 ? (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", twinAccent.iconChip)}>
              {unreadCount} new
            </span>
          ) : null}
          {busy ? <Loader2 className={cn("size-4 animate-spin", twinAccent.spinner)} aria-hidden /> : null}
        </div>
      ) : busy ? (
        <Loader2 className={cn("mb-2 size-4 animate-spin", twinAccent.spinner)} aria-hidden />
      ) : null}

      {error ? <p className="mb-2 text-xs text-red-300">{error}</p> : null}

      <div className={cn("space-y-3 overflow-y-auto", compact ? "" : "max-h-56")}>
        {shareComments.length === 0 ? (
          <p className="text-xs text-zinc-500">No share-link comments yet.</p>
        ) : null}
        {shareComments.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/[0.06] bg-[#0B0F15]/40 p-2">
            <p className="text-xs text-zinc-300">
              <span className={cn("font-semibold", twinAccent.text)}>
                {c.author_display ?? "Team"}
              </span>
              {c.share_token_id ? (
                <span className="ml-1 text-[10px] text-zinc-500">via share link</span>
              ) : null}
              : {c.body}
            </p>
            {(repliesByParent.get(c.id) ?? []).map((r) => (
              <p key={r.id} className="ml-3 mt-1 text-[11px] text-zinc-400">
                ↳ {r.body}
              </p>
            ))}
            <button
              type="button"
              onClick={() => setReplyTo(c.id)}
              className={cn("mt-1 text-[10px] font-semibold", twinAccent.link)}
            >
              Reply
            </button>
          </div>
        ))}
      </div>

      {replyTo ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Write a reply"
            className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0F15]/60 px-3 py-2 text-xs text-zinc-100"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => void submitReply()} className={twinAccent.button}>
              Send reply
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyBody("");
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pins</p>
        {pins.length === 0 ? <p className="text-xs text-zinc-500">No pins yet.</p> : null}
        {pins.map((p) => (
          <div
            key={p.id}
            className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-2 py-1.5"
          >
            <span className="text-xs text-zinc-300">{p.title}</span>
            <select
              value={p.pin_status}
              onChange={(e) => void updatePinStatus(p.id, e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0B0F15]/60 px-2 py-1 text-[10px] text-zinc-200"
            >
              {PIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
