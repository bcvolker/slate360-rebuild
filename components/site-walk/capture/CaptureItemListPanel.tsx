"use client";

import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { CAPTURE_CLASSIFICATIONS, CAPTURE_ITEM_STATUSES, type CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { darkFieldClass } from "@/components/ui/dark-surface-styles";

type Props = {
  items: CaptureItemRecord[];
  activeItemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CaptureItemRecord) => void;
};

export function CaptureItemListPanel({ items, activeItemId, open, onOpenChange, onSelect }: Props) {
  const [classification, setClassification] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => items.filter((item) => {
    const classMatch = classification === "all" || item.category === classification;
    const statusMatch = status === "all" || item.item_status === status;
    return classMatch && statusMatch;
  }), [classification, items, status]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
      <button type="button" onClick={() => onOpenChange(!open)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950/55 px-4 py-3 text-left text-sm font-black text-slate-100 ring-1 ring-white/10">
        <span className="inline-flex items-center gap-2"><ListFilter className="h-4 w-4 text-[var(--graphite-primary)]" /> Items in this walk</span>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] px-2 py-1 text-xs text-[var(--graphite-primary)]">{filtered.length}/{items.length}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={classification} onChange={(event) => setClassification(event.target.value)} className={darkFieldClass("bg-slate-950/70 py-2 font-bold")}>
              <option value="all">All classifications</option>
              {CAPTURE_CLASSIFICATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={darkFieldClass("bg-slate-950/70 py-2 font-bold")}>
              <option value="all">All statuses</option>
              {CAPTURE_ITEM_STATUSES.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button key={item.id} type="button" onClick={() => onSelect(item)} className={`w-full rounded-2xl border p-3 text-left transition ${item.id === activeItemId ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]" : "border-white/10 bg-slate-950/45 hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-black text-white">{item.title || "Untitled item"}</p>
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-black uppercase text-slate-400">{item.priority}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400">{item.category ?? "Observation"} · {item.item_status.replace("_", " ")} · {new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 text-sm font-bold text-slate-400">No items match this filter yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
