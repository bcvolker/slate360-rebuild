"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LibraryCard } from "@/lib/spatial-walkthrough/library-filter";
import { emptyLibraryFilter, filterWalkthroughCards, uniqueField, type LibraryFilter } from "@/lib/spatial-walkthrough/library-filter";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

type Props = {
  items: LibraryCard[];
  hrefFor: (item: LibraryCard) => string;
};

export function WalkthroughSpaceList({ items, hrefFor }: Props) {
  const [filter, setFilter] = useState<LibraryFilter>(emptyLibraryFilter);
  const options = useMemo(() => ({
    buildings: uniqueField(items, "building"),
    floors: uniqueField(items, "floor"),
    zones: uniqueField(items, "zone"),
    types: uniqueField(items, "walkthrough_type"),
  }), [items]);
  const filtered = filterWalkthroughCards(items, filter);
  const set = (key: keyof LibraryFilter, value: string) => setFilter((f) => ({ ...f, [key]: value }));

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Spaces</p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
        <input value={filter.q} onChange={(e) => set("q", e.target.value)} placeholder="Search space" className="h-11 min-w-[8rem] border border-white/10 bg-transparent px-3 text-sm" />
        <input type="date" value={filter.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} aria-label="Date" className="h-11 min-w-[9rem] border border-white/10 bg-transparent px-2 text-sm" />
        <Filter label="Building" value={filter.building} onChange={(v) => set("building", v)} options={options.buildings} />
        <Filter label="Floor" value={filter.floor} onChange={(v) => set("floor", v)} options={options.floors} />
        <Filter label="Room / zone" value={filter.zone} onChange={(v) => set("zone", v)} options={options.zones} />
        <Filter label="Type" value={filter.type} onChange={(v) => set("type", v)} options={options.types} />
      </div>
      <ul className="space-y-2">
        {filtered.map((item) => (
          <li key={item.id}>
            <Link href={hrefFor(item)} className="sw-lib-row">
              <span>
                <span className="block font-medium text-[var(--graphite-text-header)]">{item.title}</span>
                <small className="lg:hidden">{[item.building, item.floor, item.zone].filter(Boolean).join(" · ")}</small>
              </span>
              <small>{item.captured_at ? new Date(item.captured_at).toLocaleDateString() : "—"}</small>
              <small>{item.building ?? "—"}</small>
              <small>{item.floor ?? "—"}</small>
              <small>{item.zone ?? "—"}</small>
              <small>{item.walkthrough_type ?? "—"}</small>
              <small>{item.duration_s != null ? `${Math.floor(item.duration_s / 60)}:${String(Math.round(item.duration_s % 60)).padStart(2, "0")}` : "—"}</small>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex h-11 min-w-[8rem] items-center border border-white/10 px-2 text-sm text-[var(--graphite-muted)]">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent">
        <option value="">{label}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}
