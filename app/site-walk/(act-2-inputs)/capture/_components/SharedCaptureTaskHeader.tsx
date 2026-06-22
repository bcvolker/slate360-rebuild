"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { Fragment, useState } from "react";

type Props = {
  walkName: string;
  stopLabel: string;
  contextLabel: string;
  backLabel: string;
  onBack?: () => void;
};

export function SharedCaptureTaskHeader({ walkName, stopLabel, contextLabel, backLabel, onBack }: Props) {
  const [exitConfirm, setExitConfirm] = useState(false);
  const backClass = "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-[var(--graphite-primary)] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--graphite-canvas)] shadow-lg shadow-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]";

  return (
    <Fragment>
      <header className="relative z-40 flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/90 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] text-white backdrop-blur-xl">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass} aria-label={backLabel}>
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </button>
        ) : (
          <Link href="/site-walk" className={backClass} aria-label="Back to Site Walk">
            <ArrowLeft className="h-4 w-4" /> Site Walk
          </Link>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-black text-white">{stopLabel} · {contextLabel}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--graphite-primary)_75%,transparent)]">{walkName}</p>
        </div>
        <button type="button" onClick={() => setExitConfirm(true)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-red-500/25 bg-black/25 px-2.5 text-[10px] font-black text-red-200/85 hover:bg-red-500/15" aria-label="Exit walk">
          <LogOut className="h-3.5 w-3.5" /> Exit
        </button>
      </header>
      {exitConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-sm" onClick={() => setExitConfirm(false)}>
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900 p-5 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-base font-black text-white">Exit this walk?</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">Saved stops will remain available. Unsaved changes may be lost.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setExitConfirm(false)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-black text-white">Cancel</button>
              <Link href="/site-walk" className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-black text-white">Exit Walk</Link>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}