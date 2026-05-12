"use client";

import Link from "next/link";
import { ArrowLeft, Camera, FileUp } from "lucide-react";

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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">Site Visit</p>
        <h1 className="mt-1 text-lg font-black">{walkName || "Site Visit"}</h1>
        <div className="mt-4 flex flex-col gap-3">
          <button type="button" onClick={onPlanMode} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-400 disabled:opacity-60">
            <FileUp className="h-5 w-5" /> Open Plan Room / Upload Plans
          </button>
          <button type="button" onClick={onCameraOnly} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-amber-300/50 hover:bg-white/[0.1]">
            <Camera className="h-5 w-5" /> Camera-only Capture
          </button>
        </div>
      </div>
    </section>
  );
}
