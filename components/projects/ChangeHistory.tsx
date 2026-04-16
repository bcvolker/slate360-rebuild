"use client";

import { Clock, History, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO string
  label: string;     // e.g. "Status changed to Closed"
  actor?: string;    // user display name or email
  detail?: string;   // extra context (old → new)
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;         // e.g. "RFI #12 – Roof drain detail"
  entries: HistoryEntry[];
  subfolder?: string;    // SlateDrop subfolder name, e.g. "RFIs"
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function ChangeHistory({ open, onClose, title, entries, subfolder }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <History className="h-4 w-4 shrink-0 text-amber-500" />
              Change History
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SlateDrop indicator */}
        {subfolder && (
          <div className="border-b border-gray-100 bg-amber-50 px-5 py-2.5">
            <p className="text-[11px] text-orange-700">
              <span className="font-semibold">Saved to:</span>{" "}
              <span className="font-mono">/Projects/…/{subfolder}/</span>
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-8 w-8 text-gray-200" />
              <p className="mt-3 text-sm text-gray-400">No history recorded yet</p>
              <p className="mt-1 text-xs text-gray-300">Changes will appear here as they happen</p>
            </div>
          ) : (
            <ol className="relative space-y-0 border-l border-gray-200 pl-5">
              {entries.map((entry, idx) => (
                <li key={entry.id} className={`relative ${idx < entries.length - 1 ? "pb-6" : ""}`}>
                  {/* Dot */}
                  <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  </span>

                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-800">{entry.label}</p>
                    {entry.detail && (
                      <p className="text-xs text-gray-500">{entry.detail}</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span title={fmtTimestamp(entry.timestamp)}>
                        {relativeTime(entry.timestamp)}
                      </span>
                      {entry.actor && (
                        <>
                          <span>·</span>
                          <span>{entry.actor}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-[10px] text-gray-400">
            Full audit log retained · Changes auto-saved
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Helper: build history entries from a record ─────────────────── */
export function buildBaseHistory(record: {
  created_at?: string;
  updated_at?: string | null;
  status?: string;
  closed_at?: string | null;
  completed_at?: string | null;
}): HistoryEntry[] {
  const entries: HistoryEntry[] = [];

  if (record.created_at) {
    entries.push({ id: "created", timestamp: record.created_at, label: "Record created" });
  }
  if (record.updated_at && record.updated_at !== record.created_at) {
    entries.push({ id: "updated", timestamp: record.updated_at, label: "Record last updated" });
  }
  if (record.closed_at) {
    entries.push({ id: "closed", timestamp: record.closed_at, label: `Status changed to Closed` });
  }
  if (record.completed_at) {
    entries.push({ id: "completed", timestamp: record.completed_at, label: "Marked as completed" });
  }

  // Sort newest first
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
