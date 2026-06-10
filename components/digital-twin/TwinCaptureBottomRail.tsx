"use client";

import { Check, Flashlight } from "lucide-react";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import {
  TWIN_CAPTURE_GLASS,
  TWIN_CAPTURE_GLASS_SQUARE,
  TWIN_CAPTURE_HUD_TEXT,
} from "./twin-capture-glass";
import { TWIN_CAPTURE_POLISH } from "./twin-capture-polish-tokens";
import type { TwinCaptureMode } from "./useTwinCaptureSession";

type Props = {
  hidden?: boolean;
  mode: TwinCaptureMode;
  clipCount: number;
  isRecording: boolean;
  isStreaming: boolean;
  needsResume?: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  hasContent: boolean;
  finishing?: boolean;
  coverageProgress: number;
  onTorchToggle: () => void;
  onShutterTap: () => void;
  onDone: () => void;
};

export function TwinCaptureBottomRail({
  hidden,
  mode,
  clipCount,
  isRecording,
  isStreaming,
  needsResume = false,
  torchSupported,
  torchOn,
  hasContent,
  finishing = false,
  coverageProgress,
  onTorchToggle,
  onShutterTap,
  onDone,
}: Props) {
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";
  const photosMode = mode === "photos";
  const progressDeg = Math.round(Math.min(1, Math.max(0, coverageProgress)) * 360);
  const ringInset = TWIN_CAPTURE_POLISH.coverageRingWidthPx;
  const innerSize = TWIN_CAPTURE_CHROME.shutterSizePx - ringInset * 2;
  const shutterEnabled = needsResume || (isStreaming && !needsResume);
  const recRed = "var(--destructive)";
  const prominentDone = hasContent && !isRecording && !finishing;
  const hintText = needsResume
    ? "tap to resume camera"
    : clipCount >= 1 && !isRecording
      ? "tap blue to add another clip · Done when finished"
      : "tap blue to start · red to stop · check = review";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <p
        className={`pointer-events-none absolute inset-x-0 mx-auto w-fit max-w-[90%] px-3 py-1 text-center text-[11px] font-medium ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS}`}
        style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.hintBottomPx}px + ${safeBottom})` }}
        data-twin-chrome="hint"
      >
        {hintText}
      </p>

      <div
        className="pointer-events-auto absolute inset-x-0"
        style={{
          bottom: `calc(${TWIN_CAPTURE_CHROME.railLabelBottomPx}px + ${safeBottom})`,
          paddingLeft: TWIN_CAPTURE_CHROME.railSideInsetPx,
          paddingRight: TWIN_CAPTURE_CHROME.railSideInsetPx,
        }}
        data-twin-chrome="bottom-rail"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          {torchSupported ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTorchToggle();
              }}
              data-twin-chrome="light-button"
              className={`inline-flex items-center justify-center justify-self-start transition active:scale-[0.98] ${TWIN_CAPTURE_GLASS_SQUARE} ${
                torchOn
                  ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_22%,transparent)] text-[var(--twin360-blue)] ring-2 ring-[var(--accent-border-blue)] ring-offset-1 ring-offset-transparent"
                  : TWIN_CAPTURE_HUD_TEXT
              }`}
              style={{
                width: TWIN_CAPTURE_CHROME.lightButtonSizePx,
                height: TWIN_CAPTURE_CHROME.lightButtonSizePx,
              }}
              aria-pressed={torchOn}
              aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
            >
              <Flashlight className={`h-5 w-5 ${torchOn ? "fill-current" : ""}`} />
            </button>
          ) : (
            <span aria-hidden />
          )}

          <div
            className="relative justify-self-center"
            style={{
              width: TWIN_CAPTURE_CHROME.shutterSizePx,
              height: TWIN_CAPTURE_CHROME.shutterSizePx,
              marginBottom: TWIN_CAPTURE_CHROME.shutterRaisePx,
            }}
            data-twin-chrome="coverage-ring"
          >
            {!isRecording && progressDeg > 0 ? (
              <div
                className="pointer-events-none absolute -inset-[3px] rounded-full"
                style={{
                  background: `conic-gradient(from -90deg, var(--twin360-blue) 0deg ${progressDeg}deg, transparent ${progressDeg}deg 360deg)`,
                  opacity: 0.55,
                }}
                aria-hidden
              />
            ) : null}
            {isRecording ? (
              <div
                className="absolute inset-0 rounded-full border-[3px]"
                style={{ borderColor: recRed }}
                aria-hidden
              />
            ) : null}

            <button
              type="button"
              disabled={!shutterEnabled}
              onClick={(event) => {
                event.stopPropagation();
                onShutterTap();
              }}
              data-twin-chrome="shutter"
              className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50"
              style={{
                width: isRecording ? innerSize : TWIN_CAPTURE_CHROME.shutterSizePx,
                height: isRecording ? innerSize : TWIN_CAPTURE_CHROME.shutterSizePx,
              }}
              aria-label={
                needsResume
                  ? "Resume camera"
                  : isRecording
                    ? photosMode
                      ? "Stop photo capture"
                      : "End clip"
                    : photosMode
                      ? "Start photo capture"
                      : "Start recording"
              }
            >
              {isRecording ? (
                <span
                  className="rounded-md"
                  style={{
                    width: TWIN_CAPTURE_CHROME.shutterStopPx,
                    height: TWIN_CAPTURE_CHROME.shutterStopPx,
                    backgroundColor: recRed,
                  }}
                />
              ) : (
                <span
                  className="h-full w-full rounded-full bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)]"
                  aria-hidden
                />
              )}
            </button>
          </div>

          <button
            type="button"
            disabled={!hasContent || finishing || isRecording}
            onClick={(event) => {
              event.stopPropagation();
              onDone();
            }}
            data-twin-chrome="done-button"
            data-twin-chrome-prominent={prominentDone ? "true" : "false"}
            className={`inline-flex items-center justify-center justify-self-end rounded-full text-[var(--graphite-canvas)] transition active:scale-[0.98] ${
              prominentDone
                ? "bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)]"
                : "bg-[var(--twin360-blue)] opacity-35"
            } disabled:pointer-events-none`}
            style={{
              width: TWIN_CAPTURE_CHROME.doneButtonSizePx,
              height: TWIN_CAPTURE_CHROME.doneButtonSizePx,
            }}
            aria-label="Review capture"
          >
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] gap-1 text-[11px] leading-none">
          {torchSupported ? (
            <span
              className={`justify-self-start px-2 py-0.5 font-medium ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS}`}
            >
              {torchOn ? "Light on" : "Light"}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <span aria-hidden />
          <span
            className={`justify-self-end px-2 py-0.5 font-semibold ${TWIN_CAPTURE_GLASS} ${
              prominentDone ? "text-[var(--twin360-blue)]" : TWIN_CAPTURE_HUD_TEXT
            } ${prominentDone ? "" : "opacity-50"}`}
          >
            {finishing ? "Preparing…" : "Done"}
          </span>
        </div>
      </div>
    </div>
  );
}
