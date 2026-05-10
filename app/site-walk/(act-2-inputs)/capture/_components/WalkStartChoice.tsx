"use client";

import Link from "next/link";
import { Camera, Map, ArrowLeft } from "lucide-react";

type Props = {
  walkName: string;
  onPlanMode: () => void;
  onCameraOnly: () => void;
};

export function WalkStartChoice({ walkName, onPlanMode, onCameraOnly }: Props) {
  return (
    <section className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),rgba(2,6,23,0.98)_52%)] p-4 text-white">
      <div className="w-full max-w-sm text-center">
        <Link href="/site-walk" className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/45 px-3 text-xs font-black text-white/80 hover:border-amber-300/50 hover:text-amber-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">Start Walk</p>
        <h1 className="mt-1 text-lg font-black">{walkName || "Site Walk"}</h1>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onPlanMode} className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/60 p-4 transition hover:border-amber-300/60 hover:bg-amber-500/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-100"><Map className="h-5 w-5" /></span>
            <span className="text-xs font-black text-white">Plans</span>
          </button>
          <button type="button" onClick={onCameraOnly} className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/60 p-4 transition hover:border-amber-300/60 hover:bg-amber-500/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-100"><Camera className="h-5 w-5" /></span>
            <span className="text-xs font-black text-white">Camera Only</span>
          </button>
        </div>
      </div>
    </section>
  );
}
