"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";

type Props = {
  stopCount: number;
  backHref: string;
};

export function CaptureV2WalkReviewTopBar({ stopCount, backHref }: Props) {
  return (
    <header
      className={`${walkReviewTokens.margin} shrink-0 pt-[max(env(safe-area-inset-top),8px)] pb-2`}
      data-walk-review="top-bar"
    >
      <div
        className={`flex h-11 items-center gap-2 ${walkReviewTokens.glassBar} ${walkReviewTokens.glassBarRadius} px-2`}
      >
        <Link
          href={backHref}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] active:scale-[0.98]"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className={`min-w-0 flex-1 text-center ${walkReviewTokens.monoGreenLabel}`}>
          WALK REVIEW · {stopCount} STOP{stopCount === 1 ? "" : "S"}
        </p>
        <span className="h-9 w-9 shrink-0" aria-hidden />
      </div>
    </header>
  );
}
