"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, MapPin, Minus, Plus, Search } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import GlassCard from "@/components/shared/GlassCard";
import type { LayerFilter } from "./plan-layer-types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [pageInput, setPageInput] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);
  const total = pages.length;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pages.map((page, index) => ({ page, index }));
    return pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => page.label.toLowerCase().includes(term) || String(page.pageNumber).includes(term));
  }, [pages, query]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const node = strip.querySelector<HTMLElement>(`[data-page-index="${activeIndex}"]`);
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex, collapsed]);

  function handlePageInputSubmit() {
    const target = Number.parseInt(pageInput.trim(), 10);
    if (!Number.isFinite(target)) return;
    const clamped = Math.min(Math.max(target, 1), Math.max(total, 1));
    const index = pages.findIndex((page) => page.pageNumber === clamped);
    if (index >= 0) onSelect(index);
    setPageInput("");
  }

  return (
    <GlassCard className="absolute inset-x-3 top-16 z-20 flex flex-col gap-2 bg-slate-950/75 p-2 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCollapsed((current) => !current)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/80 hover:text-amber-100" aria-label={collapsed ? "Expand plan toolbar" : "Collapse plan toolbar"}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Plans
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{total === 0 ? "No pages" : `${activeIndex + 1} / ${total}`}</span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-xl bg-white/[0.05] px-1">
            <Search className="h-4 w-4 text-amber-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sheet…" className="h-9 w-32 bg-transparent px-2 text-xs font-bold text-white outline-none placeholder:text-slate-500 sm:w-44" aria-label="Search plan pages" />
          </div>

          <form onSubmit={(event) => { event.preventDefault(); handlePageInputSubmit(); }} className="flex items-center rounded-xl bg-white/[0.05] px-1">
            <span className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pg</span>
            <input value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ""))} placeholder="#" inputMode="numeric" className="h-9 w-12 bg-transparent text-center text-xs font-black text-white outline-none placeholder:text-slate-500" aria-label="Go to page number" />
          </form>

          <LayerToggle filter={filter} onChangeFilter={onChangeFilter} pinCount={pinCount} />

          <div className="flex items-center rounded-xl bg-white/[0.05]">
            <button type="button" onClick={() => onZoom(-0.15)} className="inline-flex h-9 w-9 items-center justify-center rounded-l-xl text-white/75 hover:text-amber-100" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
            <span className="min-w-[2.75rem] text-center text-[10px] font-black text-slate-300">{zoomPercent}%</span>
            <button type="button" onClick={() => onZoom(0.15)} className="inline-flex h-9 w-9 items-center justify-center rounded-r-xl text-white/75 hover:text-amber-100" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div ref={stripRef} className="flex max-w-full items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar" role="listbox" aria-label="Plan page thumbnails">
          {filtered.length === 0 && (
            <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-400">{total === 0 ? "Upload a plan set to enable navigation." : "No matching pages."}</p>
          )}
          {filtered.map(({ page, index }) => (
            <button
              key={page.key}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              data-page-index={index}
              onClick={() => onSelect(index)}
              className={`group flex h-24 w-20 shrink-0 flex-col items-center gap-1 rounded-xl border bg-white/[0.04] p-1 transition ${index === activeIndex ? "border-amber-400 ring-2 ring-amber-500/40" : "border-white/10 hover:border-amber-400/50"}`}
            >
              <PlanThumbnail fileUrl={fileUrl} pageNumber={page.pageNumber} />
              <span className="line-clamp-1 px-1 text-[9px] font-black uppercase tracking-wider text-white/80">{page.label}</span>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function PlanThumbnail({ fileUrl, pageNumber }: { fileUrl: string | null; pageNumber: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-16 w-full items-center justify-center overflow-hidden rounded-md bg-white text-slate-400">
      {visible && fileUrl ? (
        <Document file={fileUrl} loading={<span className="text-[8px]">…</span>}>
          <Page pageNumber={pageNumber} width={64} renderAnnotationLayer={false} renderTextLayer={false} loading={<span className="text-[8px]">…</span>} className="overflow-hidden bg-white [&_canvas]:!h-auto [&_canvas]:!max-w-full" />
        </Document>
      ) : (
        <span className="text-[9px] font-black text-slate-400">{pageNumber}</span>
      )}
    </div>
  );
}

function LayerToggle({ filter, onChangeFilter, pinCount }: { filter: LayerFilter; onChangeFilter: (filter: LayerFilter) => void; pinCount: number }) {
  return (
    <div className="flex items-center rounded-xl bg-white/[0.05] p-1" role="group" aria-label="Pin layer visibility">
      <Layers className="ml-1.5 h-3.5 w-3.5 text-amber-400" aria-hidden />
      <LayerButton active={filter === "all"} icon={<Eye className="h-3.5 w-3.5" />} label="All" onClick={() => onChangeFilter("all")} />
      <LayerButton active={filter === "current"} icon={<MapPin className="h-3.5 w-3.5" />} label="Mine" onClick={() => onChangeFilter("current")} />
      <LayerButton active={filter === "none"} icon={<EyeOff className="h-3.5 w-3.5" />} label="Hide" onClick={() => onChangeFilter("none")} danger />
      <span className="ml-1.5 mr-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-white/[0.06] px-1.5 text-[10px] font-black text-slate-200" aria-label={`${pinCount} pins visible`}>{pinCount}</span>
    </div>
  );
}

function LayerButton({ active, icon, label, onClick, danger = false }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const activeClass = danger ? "bg-rose-500/20 text-rose-200" : "bg-amber-500/20 text-amber-200";
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black uppercase tracking-wider transition ${active ? activeClass : "text-slate-400 hover:text-amber-100"}`}>
      {icon} {label}
    </button>
  );
}
