"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import type { ReactNode } from "react";
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
  const backControlClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100";

  return (
    <header
      className={`relative ${CAPTURE_V2_LAYERS.taskHeader} flex shrink-0 items-center gap-2.5 border-b border-white/[0.05] bg-[#0B0F15]/80 px-3 pb-2.5 pt-[max(env(safe-area-inset-top),0.5rem)] text-white backdrop-blur-xl`}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className={backControlClass} aria-label={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <Link href="/site-walk" className={backControlClass} aria-label="Back to Site Walk">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight text-white">{stopLabel}</p>
        <p className="truncate text-[11px] font-medium text-slate-400">
          {walkName}
          {contextLabel ? ` · ${contextLabel}` : ""}
        </p>
      </div>

      {rightSlot}

      <button
        type="button"
        onClick={onExitClick}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
        aria-label="End or exit walk"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit
      </button>
    </header>
  );
}
