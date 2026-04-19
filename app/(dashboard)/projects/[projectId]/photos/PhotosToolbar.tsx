"use client";

import { Download, Grid3X3, Image, List, Search } from "lucide-react";
import type { ViewMode, SortBy } from "./_shared";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  categories: string[];
  categoryCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  totalFiles: number;
  filteredCount: number;
  selectedIds: Set<string>;
  handleDownloadSelected: () => void;
  clearSelection: () => void;
  selectAll: () => void;
}

export default function PhotosToolbar({
  search, setSearch, categoryFilter, setCategoryFilter,
  viewMode, setViewMode, sortBy, setSortBy,
  categories, categoryCounts, typeCounts,
  totalFiles, filteredCount,
  selectedIds, handleDownloadSelected, clearSelection, selectAll,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">Total Photos</p>
          <p className="text-lg font-black text-white">{totalFiles}</p>
        </div>
        {Object.entries(categoryCounts).slice(0, 3).map(([cat, count]) => (
          <div key={cat} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-zinc-500 truncate">{cat}</p>
            <p className="text-lg font-black text-white">{count}</p>
          </div>
        ))}
        {Object.entries(typeCounts).slice(0, 2).map(([ext, count]) => (
          <div key={ext} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">{ext}</p>
            <p className="text-lg font-black text-white">{count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos…"
              className="rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/20 w-52"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-[#F59E0B] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}{c !== "All" && categoryCounts[c] ? ` (${categoryCounts[c]})` : ""}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="name">Sort: Name</option>
            <option value="date">Sort: Date</option>
            <option value="type">Sort: Type</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-semibold text-[#F59E0B]">{selectedIds.size} selected</span>
              <button onClick={handleDownloadSelected} className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20">
                <Download size={12} className="inline mr-1" />Download
              </button>
              <button onClick={clearSelection} className="rounded-md px-1.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800">Clear</button>
            </div>
          )}
          {([ ["grid", Grid3X3], ["masonry", Image], ["list", List] ] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md p-1.5 transition ${viewMode === mode ? "bg-[#F59E0B] text-white" : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {selectedIds.size === 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <button onClick={selectAll} className="text-[#F59E0B] hover:underline">Select all ({filteredCount})</button>
          <span>· Showing {filteredCount} of {totalFiles}</span>
        </div>
      )}
    </>
  );
}