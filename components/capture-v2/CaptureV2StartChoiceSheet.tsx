"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Map } from "lucide-react";

type Props = {
  walkLabel: string;
  onWalkOnPlans: () => void;
  onCameraOnly: () => void;
};

export function CaptureV2StartChoiceSheet({ walkLabel, onWalkOnPlans, onCameraOnly }: Props) {
  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-[var(--graphite-canvas)] px-4 pb-safe pt-[max(env(safe-area-inset-top),1rem)] text-white"
      data-capture-chrome="start-choice-sheet"
    >
      <div className="w-full max-w-sm">
        <Link
          href="/site-walk"
          className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/45 px-3 text-xs font-black text-white/80 backdrop-blur-md hover:border-amber-300/50 hover:text-amber-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/40 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">Plan walk</p>
          <h1 className="mt-1 text-lg font-black text-white">{walkLabel}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Choose how you want to capture this visit.</p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onWalkOnPlans}
              data-capture-chrome="start-choice-plan"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-400"
            >
              <Map className="h-5 w-5" aria-hidden />
              Walk on plans
            </button>
            <button
              type="button"
              onClick={onCameraOnly}
              data-capture-chrome="start-choice-camera"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-amber-300/50 hover:bg-white/[0.1]"
            >
              <Camera className="h-5 w-5" aria-hidden />
              Camera only
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
