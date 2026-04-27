"use client";

import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { CAPTURE_CLASSIFICATIONS, CAPTURE_ITEM_STATUSES, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

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
    <div className="rounded-3xl border border-slate-300 bg-slate-50 p-3">
      <button type="button" onClick={() => onOpenChange(!open)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm font-black text-slate-900 ring-1 ring-slate-200">
        <span className="inline-flex items-center gap-2"><ListFilter className="h-4 w-4 text-blue-700" /> Items in this walk</span>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-800">{filtered.length}/{items.length}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={classification} onChange={(event) => setClassification(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900">
              <option value="all">All classifications</option>
              {CAPTURE_CLASSIFICATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900">
              <option value="all">All statuses</option>
              {CAPTURE_ITEM_STATUSES.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button key={item.id} type="button" onClick={() => onSelect(item)} className={`w-full rounded-2xl border p-3 text-left transition ${item.id === activeItemId ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-black text-slate-950">{item.title || "Untitled item"}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{item.priority}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-600">{item.category ?? "Observation"} · {item.item_status.replace("_", " ")} · {new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-600">No items match this filter yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
