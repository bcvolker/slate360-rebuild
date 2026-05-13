"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Map } from "lucide-react";

type CaptureModeToggleProps = {
  mode: "plan" | "camera";
  onPlan: () => void;
  onCamera: () => void;
};

export function CaptureModeToggle({ mode, onPlan, onCamera }: CaptureModeToggleProps) {
  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/75 p-1 shadow-2xl backdrop-blur-xl">
      <button type="button" onClick={onPlan} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "plan" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
        <Map className="h-3.5 w-3.5" /> Plan
      </button>
      <button type="button" onClick={onCamera} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "camera" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
        <Camera className="h-3.5 w-3.5" /> Camera
      </button>
    </div>
  );
}

export function SiteWalkHomeButton() {
  return (
    <Link href="/site-walk" className="absolute right-3 top-3 z-30 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/75 px-3 text-xs font-black text-white/80 shadow-2xl backdrop-blur-xl hover:border-amber-300/50 hover:text-amber-100">
      <ArrowLeft className="h-4 w-4" /> Home
    </Link>
  );
}
