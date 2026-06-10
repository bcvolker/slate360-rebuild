"use client";

import { Check, Flashlight } from "lucide-react";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_GLASS_SQUARE } from "./twin-capture-glass";
import { TWIN_CAPTURE_POLISH } from "./twin-capture-polish-tokens";
import type { TwinCaptureMode } from "./useTwinCaptureSession";

type Props = {
  hidden?: boolean;
  mode: TwinCaptureMode;
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
  const showStopSquare = mode === "video" && isRecording;
  const progressDeg = Math.round(Math.min(1, Math.max(0, coverageProgress)) * 360);
  const ringInset = TWIN_CAPTURE_POLISH.coverageRingWidthPx;
  const innerSize = TWIN_CAPTURE_CHROME.shutterSizePx - ringInset * 2;
  const shutterEnabled = needsResume || (isStreaming && !needsResume);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <p
        className={`pointer-events-none absolute inset-x-0 mx-auto w-fit max-w-[90%] px-3 py-1 text-center text-[11px] font-medium text-[var(--graphite-text-header)] ${TWIN_CAPTURE_GLASS}`}
        style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.hintBottomPx}px + ${safeBottom})` }}
        data-twin-chrome="hint"
      >
        {needsResume
          ? "tap to resume camera"
          : photosMode
            ? "tap shutter = start/stop frames · check = review"
            : "tap square = end clip · check = review"}
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
              onClick={onTorchToggle}
              data-twin-chrome="light-button"
              className={`inline-flex items-center justify-center justify-self-start transition active:scale-[0.98] ${TWIN_CAPTURE_GLASS_SQUARE} ${
                torchOn ? "border-[var(--accent-border-blue)] text-[var(--twin360-blue)]" : ""
              }`}
              style={{
                width: TWIN_CAPTURE_CHROME.lightButtonSizePx,
                height: TWIN_CAPTURE_CHROME.lightButtonSizePx,
              }}
              aria-pressed={torchOn}
              aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
            >
              <Flashlight className="h-5 w-5" />
            </button>
          ) : (
            <span aria-hidden />
          )}

          <div
            className="relative justify-self-center rounded-full"
            style={{
              width: TWIN_CAPTURE_CHROME.shutterSizePx,
              height: TWIN_CAPTURE_CHROME.shutterSizePx,
              marginBottom: TWIN_CAPTURE_CHROME.shutterRaisePx,
            }}
            data-twin-chrome="coverage-ring"
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from -90deg, var(--twin360-blue) 0deg ${progressDeg}deg, color-mix(in srgb, var(--mobile-app-card-border) 70%, transparent) ${progressDeg}deg 360deg)`,
              }}
              aria-hidden
            />
            <button
              type="button"
              disabled={!shutterEnabled}
              onClick={onShutterTap}
              data-twin-chrome="shutter"
              className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--graphite-canvas)] transition active:scale-95 disabled:opacity-50"
              style={{ width: innerSize, height: innerSize }}
              aria-label={
                needsResume
                  ? "Resume camera"
                  : photosMode
                    ? isRecording
                      ? "Stop photo capture"
                      : "Start photo capture"
                    : isRecording
                      ? "End clip"
                      : "Start recording"
              }
            >
              {showStopSquare ? (
                <span
                  className="rounded-md bg-[var(--twin360-blue)]"
                  style={{
                    width: TWIN_CAPTURE_CHROME.shutterStopPx,
                    height: TWIN_CAPTURE_CHROME.shutterStopPx,
                  }}
                />
              ) : isRecording || photosMode ? null : (
                <span
                  className="rounded-full border-2 border-[color-mix(in_srgb,var(--graphite-canvas)_35%,transparent)] bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)]"
                  style={{
                    width: TWIN_CAPTURE_CHROME.shutterInnerPx - ringInset * 2,
                    height: TWIN_CAPTURE_CHROME.shutterInnerPx - ringInset * 2,
                  }}
                />
              )}
            </button>
          </div>

          <button
            type="button"
            disabled={!hasContent || finishing}
            onClick={onDone}
            data-twin-chrome="done-button"
            className="inline-flex items-center justify-center justify-self-end rounded-full bg-[var(--twin360-blue)] text-[var(--graphite-canvas)] shadow-[var(--mobile-app-card-glow-info)] transition active:scale-[0.98] disabled:opacity-35"
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
              className={`justify-self-start px-2 py-0.5 font-medium text-[var(--graphite-text-header)] ${TWIN_CAPTURE_GLASS}`}
            >
              {torchOn ? "Light on" : "Light"}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <span aria-hidden />
          <span
            className={`justify-self-end px-2 py-0.5 font-semibold ${TWIN_CAPTURE_GLASS} ${
              hasContent ? "text-[var(--twin360-blue)]" : "text-[var(--graphite-muted)]"
            }`}
          >
            {finishing ? "Preparing…" : "Done"}
          </span>
        </div>
      </div>
    </div>
  );
}
