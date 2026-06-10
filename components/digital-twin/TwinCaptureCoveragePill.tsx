"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";
import { TWIN_CAPTURE_POLISH, type TwinCapturePaceState } from "./twin-capture-polish-tokens";

type Props = {
  hidden?: boolean;
  coveragePct: number;
  paceState: TwinCapturePaceState;
};

export function TwinCaptureCoveragePill({ hidden, coveragePct, paceState }: Props) {
  if (hidden) return null;

  const topOffset =
    TWIN_CAPTURE_CHROME.topInsetPx +
    TWIN_CAPTURE_CHROME.topBarHeightPx +
    TWIN_CAPTURE_POLISH.coveragePillTopGapPx;

  return (
    <div
      className="pointer-events-none absolute right-3 z-20"
      style={{ top: `calc(max(env(safe-area-inset-top), 0px) + ${topOffset}px)` }}
      data-twin-chrome="coverage-pill"
    >
      <span className={`inline-flex flex-col items-end gap-0.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${TWIN_CAPTURE_GLASS}`}>
        <span className="font-extrabold text-[var(--twin360-blue)]">COVERAGE {coveragePct}%</span>
        {paceState ? (
          <span
            className={
              paceState === "slow" ? "font-semibold text-[var(--destructive)]" : TWIN_CAPTURE_HUD_TEXT
            }
          >
            {paceState === "slow" ? "SLOW DOWN" : "PACE GOOD"}
          </span>
        ) : null}
      </span>
    </div>
  );
}
