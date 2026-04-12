"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { SiteWalkComment } from "@/lib/types/site-walk";

type Props = {
  sessionId: string;
  itemId?: string;
  isField?: boolean;
  currentUserId: string;
};

export function CommentThread({ sessionId, itemId, isField, currentUserId }: Props) {
  const [comments, setComments] = useState<SiteWalkComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const params = new URLSearchParams({ session_id: sessionId });
    if (itemId) params.set("item_id", itemId);
    const res = await fetch(`/api/site-walk/comments?${params}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
    setLoading(false);
  }, [sessionId, itemId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSend(escalation = false) {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/site-walk/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_id: itemId,
          body: body.trim(),
          is_field: isField ?? false,
          is_escalation: escalation,
        }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setBody("");
      }
    } finally {
      setSending(false);
    }
  }

  async function markRead(commentId: string) {
    await fetch(`/api/site-walk/comments/${commentId}/read`, { method: "POST" });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId && !c.read_by.includes(currentUserId)
          ? { ...c, read_by: [...c.read_by, currentUserId] }
          : c,
      ),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      )}

      {comments.map((c) => {
        const isOwn = c.author_id === currentUserId;
        const isRead = c.read_by.includes(currentUserId);
        return (
          <Card
            key={c.id}
            className={`p-3 ${c.is_escalation ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : ""} ${!isRead && !isOwn ? "border-l-2 border-l-primary" : ""}`}
            onClick={() => !isRead && !isOwn && markRead(c.id)}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {c.is_escalation && <AlertTriangle className="h-3 w-3 text-amber-500" />}
              <span className={c.is_field ? "text-green-600" : "text-blue-600"}>
                {c.is_field ? "Field" : "Office"}
              </span>
              <span>·</span>
              <span>{new Date(c.created_at).toLocaleString()}</span>
              {!isRead && !isOwn && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  New
                </span>
              )}
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
          </Card>
        );
      })}

      {/* Compose */}
      <div className="flex flex-col gap-2 border-t pt-3">
        <Textarea
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleSend(false)}
            disabled={!body.trim() || sending}
          >
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-600 hover:text-amber-700"
            onClick={() => handleSend(true)}
            disabled={!body.trim() || sending}
          >
            <AlertTriangle className="mr-1 h-3 w-3" /> Escalate
          </Button>
        </div>
      </div>
    </div>
  );
}
