"use client";

import { useEffect, useState } from "react";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";
import {
  TWIN_CAPTURE_GUIDE,
  TWIN_CAPTURE_POLISH,
  twinGuideStateColor,
  twinGuideStateLabel,
  type TwinCaptureGuideState,
} from "./twin-capture-polish-tokens";

type Props = {
  hidden?: boolean;
  coverageProgress: number;
  guideState: TwinCaptureGuideState;
  sensorsGranted: boolean;
};

export function TwinCaptureGuide({
  hidden,
  coverageProgress,
  guideState,
  sensorsGranted,
}: Props) {
  const [dimmed, setDimmed] = useState(false);

  useEffect(() => {
    if (guideState !== "good") {
      setDimmed(false);
      return;
    }
    const timer = window.setTimeout(() => setDimmed(true), TWIN_CAPTURE_GUIDE.goodDimAfterMs);
    return () => window.clearTimeout(timer);
  }, [guideState]);

  if (hidden) return null;

  const topOffset =
    TWIN_CAPTURE_CHROME.topInsetPx +
    TWIN_CAPTURE_CHROME.topBarHeightPx +
    TWIN_CAPTURE_POLISH.guideTopGapPx;
  const size = TWIN_CAPTURE_GUIDE.ringSizePx;
  const stroke = TWIN_CAPTURE_GUIDE.ringStrokePx;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, coverageProgress));
  const dashOffset = circumference * (1 - progress);
  const stateColor = twinGuideStateColor(guideState);
  const label = sensorsGranted ? twinGuideStateLabel(guideState) : null;
  const opacity = dimmed && guideState === "good" ? TWIN_CAPTURE_GUIDE.goodDimOpacity : 1;

  return (
    <div
      className="pointer-events-none absolute right-3 z-20 flex flex-col items-end gap-1"
      style={{
        top: `calc(max(env(safe-area-inset-top), 0px) + ${topOffset}px)`,
        opacity,
        transition: "opacity 400ms ease",
      }}
      data-twin-chrome="capture-guide"
      data-twin-guide-state={guideState ?? "none"}
    >
      <div
        className={`inline-flex items-center justify-center ${TWIN_CAPTURE_GLASS}`}
        style={{ width: size, height: size, opacity: 0.85 }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stateColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </div>
      {label ? (
        <span
          className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${TWIN_CAPTURE_GLASS} ${TWIN_CAPTURE_HUD_TEXT}`}
          style={{ color: stateColor, opacity: 0.85 }}
          data-twin-guide-label
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
