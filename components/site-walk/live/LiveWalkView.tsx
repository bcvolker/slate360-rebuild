"use client";

import { useMemo, useState } from "react";
import { Activity, CheckCircle2, MapPin } from "lucide-react";
import type { LiveWalkItem, LiveWalkSession } from "./live-walk-types";
import { getItemDetail, groupItemsByLocation } from "./live-walk-utils";
import { MarkupImagePreview } from "./MarkupImagePreview";
import { useRealtimeWalk } from "./useRealtimeWalk";

type Props = {
  session: LiveWalkSession;
  initialItems: LiveWalkItem[];
};

export function LiveWalkView({ session, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? null);
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupItemsByLocation(items), [items]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  useRealtimeWalk(session.id, {
    onItemInsert: (item) => {
      setItems((current) => upsert(current, item));
      setSelectedId(item.id);
      setRecentIds((current) => new Set(current).add(item.id));
      window.setTimeout(() => setRecentIds((current) => { const next = new Set(current); next.delete(item.id); return next; }), 3000);
    },
    onItemUpdate: (item) => setItems((current) => upsert(current, item)),
    onItemDelete: (itemId) => setItems((current) => current.filter((item) => item.id !== itemId)),
  });

  return (
    <section className="grid min-h-[calc(100vh-12rem)] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Live Feed</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Location → Item</h2>
          <p className="mt-1 text-sm font-bold text-slate-600">New captures appear here without refreshing.</p>
        </div>
        <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.location} className="mb-4">
              <div className="mb-2 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-800"><MapPin className="h-4 w-4 text-blue-800" /> {group.location}</div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const active = selected?.id === item.id;
                  const recent = recentIds.has(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"} ${recent ? "animate-pulse ring-2 ring-emerald-300" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-black text-slate-950">{getItemDetail(item)}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{item.priority}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-600">{item.description || item.category || item.item_type}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-600">Waiting for the first field capture…</p>}
        </div>
      </aside>

      <main className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
        {selected ? <ItemDetail item={selected} /> : <EmptyDetail />}
      </main>
    </section>
  );
}

function ItemDetail({ item }: { item: LiveWalkItem }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Live item</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{item.title || getItemDetail(item)}</h1>
          <p className="mt-1 text-sm font-bold text-slate-600">{item.category ?? "Observation"} · {item.item_status.replace("_", " ")}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {item.sync_state}</span>
      </div>
      {item.item_type === "photo" && <MarkupImagePreview item={item} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Classification" value={item.category ?? "Observation"} />
        <Info label="Priority" value={item.priority} />
        <Info label="Status" value={item.item_status.replace("_", " ")} />
      </div>
      <section className="rounded-3xl border border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI-cleaned notes</p>
        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-800">{item.description || "No notes yet."}</p>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-300 bg-white p-3"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-sm font-black text-slate-950">{value}</p></div>;
}

function EmptyDetail() {
  return <div className="flex min-h-96 flex-col items-center justify-center text-center text-slate-600"><Activity className="h-8 w-8 text-blue-800" /><p className="mt-3 text-sm font-black">Waiting for live field data.</p></div>;
}

function upsert(items: LiveWalkItem[], item: LiveWalkItem) {
  const exists = items.some((current) => current.id === item.id);
  const next = exists ? items.map((current) => current.id === item.id ? { ...current, ...item } : current) : [item, ...items];
  return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
