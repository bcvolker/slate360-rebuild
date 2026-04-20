"use client";

import { useEffect, useState } from "react";
import { Loader2, Bug, Lightbulb, MessageSquare, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "wont_fix" | "duplicate";
type FeedbackCategory = "bug" | "suggestion" | "other";

interface FeedbackItem {
  id: string;
  category: FeedbackCategory;
  type: string;
  title: string;
  description: string;
  severity: string | null;
  status: FeedbackStatus;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

export function CommunicationsFeedbackTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/operations/feedback");
    if (!res.ok) {
      setError("Failed to load feedback");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { feedback?: FeedbackItem[] };
    setItems(data.feedback ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, newStatus: FeedbackStatus) {
    setStatusLoading(id);
    const res = await fetch(`/api/operations/feedback/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it)),
      );
    }
    setStatusLoading(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{items.length} item(s)</p>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onStatusChange={(s) => updateStatus(item.id, s)}
              statusUpdating={statusLoading === item.id}
            />
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No feedback items found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({
  item,
  expanded,
  onToggle,
  onStatusChange,
  statusUpdating,
}: {
  item: FeedbackItem;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: FeedbackStatus) => void;
  statusUpdating: boolean;
}) {
  const Icon =
    item.category === "bug" ? Bug : item.category === "suggestion" ? Lightbulb : MessageSquare;
  const iconColor =
    item.category === "bug"
      ? "text-red-500"
      : item.category === "suggestion"
      ? "text-yellow-500"
      : "text-cobalt";

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left w-full"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {item.user_name || item.user_email || "Unknown user"} ·{" "}
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          {item.severity && (
            <span className="hidden sm:inline-flex px-2 py-1 text-[10px] font-bold uppercase bg-muted/30 border border-border rounded text-muted-foreground">
              {item.severity}
            </span>
          )}
          <StatusPill status={item.status} />
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-background border-t border-border flex flex-col gap-4">
          <div className="text-sm text-foreground whitespace-pre-wrap bg-card border border-border p-4 rounded-lg">
            {item.description}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Type: <span className="text-foreground">{item.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={item.status}
                onChange={(e) => onStatusChange(e.target.value as FeedbackStatus)}
                disabled={statusUpdating}
                className="bg-card border border-border text-sm text-foreground rounded-md px-3 py-1.5 outline-none focus:border-cobalt disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {statusUpdating && <Loader2 className="w-4 h-4 animate-spin text-cobalt" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  const className =
    status === "new"
      ? "bg-cobalt/10 text-cobalt"
      : status === "resolved"
      ? "bg-green-500/15 text-green-500"
      : status === "in_progress" || status === "triaged"
      ? "bg-yellow-500/10 text-yellow-500"
      : "bg-muted/30 text-muted-foreground";
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>
      {status.replace("_", " ")}
    </span>
  );
}
