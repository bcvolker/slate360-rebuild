"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  walkName: string;
  stopLabel: string;
  contextLabel: string;
  backLabel: string;
  isAdHoc?: boolean;
  onBack?: () => void;
  rightSlot?: ReactNode;
  onExitClick: () => void;
};

export function SharedCaptureTaskHeader({
  walkName,
  stopLabel,
  backLabel,
  onBack,
  rightSlot,
  onExitClick,
}: Props) {
  const backControlClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center text-slate-500 transition-colors duration-150 hover:text-slate-200";

  return (
    <header className="z-50 flex h-14 w-full shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/80 px-4 pt-[max(env(safe-area-inset-top),0px)] backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className={backControlClass} aria-label={backLabel}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link href="/site-walk" className={backControlClass} aria-label="Back to Site Walk">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{stopLabel}</p>
          {walkName ? (
            <p className="truncate text-[11px] text-slate-400">{walkName}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {rightSlot}
        <button
          type="button"
          onClick={onExitClick}
          className="text-sm font-medium text-slate-400 transition-colors duration-150 hover:text-slate-200"
          aria-label="End or exit walk"
        >
          Exit
        </button>
      </div>
    </header>
  );
}
