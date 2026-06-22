"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { LayerFilter } from "./plan-layer-types";

export type PlanToolbarPage = {
  key: string;
  label: string;
  pageNumber: number;
};

type Props = {
  fileUrl: string | null;
  pages: PlanToolbarPage[];
  activeIndex: number;
  zoomPercent: number;
  filter: LayerFilter;
  pinCount: number;
  onSelect: (index: number) => void;
  onZoom: (delta: number) => void;
  onChangeFilter: (filter: LayerFilter) => void;
};

export function PlanToolbar({
  fileUrl,
  pages,
  activeIndex,
  zoomPercent,
  filter,
  pinCount,
  onSelect,
  onZoom,
  onChangeFilter,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = pages.length;
  const activeLabel = pages[activeIndex]?.label ?? "No pages";
  void fileUrl;
  void zoomPercent;
  void onChangeFilter;

  return (
    <div className="absolute left-3 top-3 z-[700] md:left-4 md:top-4">
      <div className="inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/78 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--graphite-primary)]"
        >
          Plans <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 max-w-[10rem] truncate text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-300"
        >
          {total === 0 ? "No pages" : `${activeIndex + 1}/${total} · ${activeLabel}`}
        </button>
        <span
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] px-2 text-[10px] font-black text-[var(--graphite-primary)]"
          aria-label={`${pinCount} pins visible`}
        >
          <MapPin className="h-3 w-3" /> {pinCount}
        </span>
        <div className="ml-1 flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onZoom(-1)} className="rounded-md px-1.5 py-0.5 text-[10px] font-black text-slate-300">
            −
          </button>
          <button type="button" onClick={() => onZoom(1)} className="rounded-md px-1.5 py-0.5 text-[10px] font-black text-slate-300">
            +
          </button>
        </div>
      </div>
      {open && total > 0 ? (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/92 p-1 shadow-2xl backdrop-blur-xl">
          {pages.map((page, index) => (
            <button
              key={page.key}
              type="button"
              onClick={() => {
                onSelect(index);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-[11px] font-semibold ${
                index === activeIndex ? "bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] text-[var(--graphite-primary)]" : "text-slate-300"
              }`}
            >
              {index + 1}/{total} · {page.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
