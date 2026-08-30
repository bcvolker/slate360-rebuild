"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type WalkthroughCard = {
  id: string;
  title: string;
  captured_at: string | null;
  building: string | null;
  floor: string | null;
  zone: string | null;
  walkthrough_type: string | null;
  status: string;
  duration_s: number | null;
  waypointCount: number;
  pinCount: number;
};

type Props = {
  items: WalkthroughCard[];
  hrefFor: (id: string) => string;
  emptyAction?: { href: string; label: string } | null;
};

function matches(item: WalkthroughCard, key: keyof WalkthroughCard, value: string): boolean {
  if (!value) return true;
  return String(item[key] ?? "").toLowerCase() === value.toLowerCase();
}

export function WalkthroughLibrary({ items, hrefFor, emptyAction }: Props) {
  const [q, setQ] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [zone, setZone] = useState("");
  const [type, setType] = useState("");

  const options = useMemo(() => ({
    buildings: unique(items.map((i) => i.building)),
    floors: unique(items.map((i) => i.floor)),
    zones: unique(items.map((i) => i.zone)),
    types: unique(items.map((i) => i.walkthrough_type)),
  }), [items]);

  const filtered = items.filter((item) => {
    if (q && !item.title.toLowerCase().includes(q.toLowerCase())) return false;
    return matches(item, "building", building) && matches(item, "floor", floor) && matches(item, "zone", zone) && matches(item, "walkthrough_type", type);
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title" className="h-11 border border-white/10 bg-transparent px-3 text-sm" />
        <FilterSelect label="Building" value={building} onChange={setBuilding} options={options.buildings} />
        <FilterSelect label="Floor" value={floor} onChange={setFloor} options={options.floors} />
        <FilterSelect label="Room / zone" value={zone} onChange={setZone} options={options.zones} />
        <FilterSelect label="Type" value={type} onChange={setType} options={options.types} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--graphite-muted)]">
          No walkthroughs match these filters.
          {emptyAction ? (
            <>
              {" "}
              <Link href={emptyAction.href} className="text-[var(--graphite-primary)]">{emptyAction.label}</Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={hrefFor(item.id)} className="block border border-white/10 bg-white/[0.04] p-4 hover:border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)]">
                <p className="font-semibold text-[var(--graphite-text-header)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">
                  {item.captured_at ? new Date(item.captured_at).toLocaleDateString() : "Date unset"}
                  {item.building ? ` · ${item.building}` : ""}
                  {item.floor ? ` · ${item.floor}` : ""}
                  {item.zone ? ` · ${item.zone}` : ""}
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
                  {formatDuration(item.duration_s)} · {item.waypointCount} waypoints · {item.pinCount} pins · {item.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex h-11 items-center border border-white/10 px-2 text-sm text-[var(--graphite-muted)]">
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

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "Duration pending";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
