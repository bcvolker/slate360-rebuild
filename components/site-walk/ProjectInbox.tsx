"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Camera, AlertCircle, MessageSquare, Loader2 } from "lucide-react";

interface InboxItem {
  id: string;
  session_id: string;
  title: string | null;
  item_type: string;
  item_status: string;
  priority: string | null;
  before_item_id: string | null;
  item_relationship: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
  /** Initial items rendered server-side; this list takes over with realtime updates. */
  initialItems: InboxItem[];
}

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-slate-500",
};

export default function ProjectInbox({ projectId, initialItems }: Props) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/inbox?projectId=${projectId}`, { cache: "no-store" });
      const json = (await res.json()) as { items?: InboxItem[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load inbox");
        return;
      }
      setItems(json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Realtime: re-fetch when items or comments change for any session in this project.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-inbox-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_walk_items" }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_walk_comments" }, () => void refetch())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [projectId, refetch]);

  if (items.length === 0 && !loading) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-white/10 rounded-xl">
        No open items. Field activity will appear here in real time.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-400 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      {loading && (
        <p className="text-xs text-slate-400 inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
        </p>
      )}
      {items.map((it) => {
        const dot = PRIORITY_DOT[it.priority ?? "low"] ?? PRIORITY_DOT.low;
        const Icon = it.item_type === "note" ? MessageSquare : it.item_type === "voice" ? MessageSquare : Camera;
        return (
          <Link
            key={it.id}
            href={`/site-walk/walks/active/${it.session_id}/items/${it.id}`}
            className="block rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden />
              <Icon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-100 truncate">{it.title || "Untitled"}</p>
                <p className="text-[11px] text-slate-500">
                  {it.item_status.replace("_", " ")}
                  {it.before_item_id ? ` · ${it.item_relationship ?? "follow-up"}` : ""}
                </p>
              </div>
              <time className="text-[11px] text-slate-500 shrink-0">
                {new Date(it.created_at).toLocaleDateString()}
              </time>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
