"use client";

import { Layers, Eye, EyeOff, MapPin } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";

export type LayerFilter = "all" | "current" | "none";

interface PlanLayerToolbarProps {
  filter: LayerFilter;
  onChangeFilter: (filter: LayerFilter) => void;
  pinCount: number;
  className?: string;
}

export function PlanLayerToolbar({ filter, onChangeFilter, pinCount, className }: PlanLayerToolbarProps) {
  return (
    <GlassCard className={cn("absolute top-4 left-1/2 z-50 flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-between p-2 pointer-events-auto", className)}>
      <div className="flex items-center gap-2 pl-2 border-r border-white/10 pr-3">
        <Layers className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
          Layers
        </span>
      </div>
      <div className="flex gap-1 flex-1 justify-center px-1">
        <button
          onClick={() => onChangeFilter("all")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors",
            filter === "all" ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/5 text-slate-400"
          )}
        >
          <Eye className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] font-bold">All</span>
        </button>
        <button
          onClick={() => onChangeFilter("current")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors",
            filter === "current" ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/5 text-slate-400"
          )}
        >
          <MapPin className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] font-bold">Current</span>
        </button>
        <button
          onClick={() => onChangeFilter("none")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors",
            filter === "none" ? "bg-rose-500/20 text-rose-300" : "hover:bg-white/5 text-slate-400"
          )}
        >
          <EyeOff className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] font-bold">Hide</span>
        </button>
      </div>
      <div className="flex items-center pl-3 pr-2 border-l border-white/10">
        <div className="flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-md bg-white/5 text-[10px] font-black text-slate-200">
          {pinCount}
        </div>
      </div>
    </GlassCard>
  );
}
