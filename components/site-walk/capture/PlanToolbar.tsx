"use client";

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

export function PlanToolbar({ fileUrl, pages, activeIndex, zoomPercent, filter, pinCount, onSelect, onZoom, onChangeFilter }: Props) {
  const total = pages.length;
  const activeLabel = pages[activeIndex]?.label ?? "No pages";
  void fileUrl;
  void zoomPercent;
  void filter;
  void onSelect;
  void onZoom;
  void onChangeFilter;

  return (
    <div className="absolute left-3 top-3 z-[700] pointer-events-none md:left-4 md:top-4">
      <div className="pointer-events-auto inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/78 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
          Plans <ChevronDown className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 max-w-[10rem] truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{total === 0 ? "No pages" : `${activeIndex + 1}/${total} · ${activeLabel}`}</span>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2 text-[10px] font-black text-amber-100" aria-label={`${pinCount} pins visible`}><MapPin className="h-3 w-3" /> {pinCount}</span>
      </div>
    </div>
  );
}
