"use client";

import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

type Props = {
  label: string;
  current: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPages: () => void;
};

export function PlanPageControls({ label, current, total, onPrevious, onNext, onOpenPages }: Props) {
  const canNavigate = total > 1;

  return (
    <GlassCard className="absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-1 bg-slate-950/70 p-1.5 shadow-2xl backdrop-blur-xl">
      <button type="button" onClick={onPrevious} disabled={!canNavigate || current <= 1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/75 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Previous plan page">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpenPages} className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-3 text-xs font-black text-slate-200 hover:text-amber-100" aria-label="Open plan pages">
        <BookOpen className="h-4 w-4 text-amber-400" />
        <span className="max-w-28 truncate">{label}</span>
        <span className="text-[10px] text-slate-500">{current}/{Math.max(total, 1)}</span>
      </button>
      <button type="button" onClick={onNext} disabled={!canNavigate || current >= total} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/75 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Next plan page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </GlassCard>
  );
}
