"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  emptyLibraryFilter,
  filterWalkthroughCards,
  uniqueField,
  type LibraryCard,
  type LibraryFilter,
} from "@/lib/spatial-walkthrough/library-filter";
import { shareStatusLabel } from "@/lib/spatial-walkthrough/share-status";
import { StatusPanel } from "@/components/spatial-walkthrough/StatusPanel";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

export type WalkthroughCard = LibraryCard;

type Props = {
  items: WalkthroughCard[];
  hrefFor?: (id: string) => string;
  emptyAction?: { href: string; label: string } | null;
  loading?: boolean;
};

function defaultHref(id: string): string {
  return `/spatial-walkthrough/${id}`;
}

export function WalkthroughLibrary({ items, hrefFor = defaultHref, emptyAction, loading = false }: Props) {
  const [filter, setFilter] = useState<LibraryFilter>(emptyLibraryFilter);
  const options = useMemo(() => ({
    buildings: uniqueField(items, "building"),
    floors: uniqueField(items, "floor"),
    zones: uniqueField(items, "zone"),
    types: uniqueField(items, "walkthrough_type"),
  }), [items]);

  const filtered = filterWalkthroughCards(items, filter);
  const set = (key: keyof LibraryFilter, value: string) => setFilter((f) => ({ ...f, [key]: value }));

  if (loading) {
    return <StatusPanel title="Loading library" body="Fetching walkthroughs for this project." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-8 lg:overflow-visible">
        <input
          value={filter.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search"
          className="h-11 min-w-[10rem] shrink-0 border border-white/10 bg-transparent px-3 text-sm lg:min-w-0"
        />
        <input
          type="date"
          value={filter.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          aria-label="From date"
          className="h-11 min-w-[9.5rem] shrink-0 border border-white/10 bg-transparent px-2 text-sm lg:min-w-0"
        />
        <input
          type="date"
          value={filter.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          aria-label="To date"
          className="h-11 min-w-[9.5rem] shrink-0 border border-white/10 bg-transparent px-2 text-sm lg:min-w-0"
        />
        <FilterSelect label="Building" value={filter.building} onChange={(v) => set("building", v)} options={options.buildings} />
        <FilterSelect label="Floor" value={filter.floor} onChange={(v) => set("floor", v)} options={options.floors} />
        <FilterSelect label="Zone" value={filter.zone} onChange={(v) => set("zone", v)} options={options.zones} />
        <FilterSelect label="Type" value={filter.type} onChange={(v) => set("type", v)} options={options.types} />
        <FilterSelect
          label="Elevation"
          value={filter.elevation}
          onChange={(v) => set("elevation", v)}
          options={["ground", "aerial"]}
        />
      </div>
      {items.length === 0 ? (
        <StatusPanel
          title="No walkthroughs yet"
          body="When a capture is published, it will appear here with building, floor, and pin counts."
          action={emptyAction}
        />
      ) : filtered.length === 0 ? (
        <StatusPanel title="No matching walkthroughs" body="Adjust date, building, floor, zone, type, or elevation." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={hrefFor(item.id)} className="sw-lib-row">
                <span>
                  <span className="block font-medium text-[var(--graphite-text-header)]">{item.title}</span>
                  <small className="lg:hidden">{metaLine(item)}</small>
                </span>
                <small>{item.captured_at ? new Date(item.captured_at).toLocaleDateString() : "Date unset"}</small>
                <small>{item.building ?? "—"}</small>
                <small>{item.floor ?? "—"}</small>
                <small>{item.zone ?? "—"}</small>
                <small>{item.walkthrough_type ?? "—"}</small>
                <small>{formatDuration(item.duration_s)} · {item.waypointCount} wp · {item.pinCount} pins</small>
                <small>{shareStatusLabel(item.shareStatus)} · {item.status}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function metaLine(item: WalkthroughCard): string {
  return [item.building, item.floor, item.zone, item.walkthrough_type].filter(Boolean).join(" · ");
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex h-11 min-h-11 min-w-[8.5rem] shrink-0 items-center border border-white/10 px-2 text-sm text-[var(--graphite-muted)] lg:min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent">
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
