"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  walkName: string;
  stopLabel: string;
  contextLabel: string;
  backLabel: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  onExitClick: () => void;
};

export function SharedCaptureTaskHeader({
  walkName,
  stopLabel,
  contextLabel,
  backLabel,
  onBack,
  rightSlot,
  onExitClick,
}: Props) {
  const backClass =
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-lg shadow-amber-500/20";

  return (
    <Fragment>
      <header
        className={`relative ${CAPTURE_V2_LAYERS.taskHeader} flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/90 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] text-white backdrop-blur-xl`}
      >
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
          <p className="truncate text-sm font-black text-white">
            {stopLabel} · {contextLabel}
          </p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">
            {walkName}
          </p>
        </div>

        {rightSlot}

        <button
          type="button"
          onClick={onExitClick}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-red-500/25 bg-black/25 px-2.5 text-[10px] font-black text-red-200/85 hover:bg-red-500/15"
          aria-label="End or exit walk"
        >
          <LogOut className="h-3.5 w-3.5" /> Exit
        </button>
      </header>
    </Fragment>
  );
}
