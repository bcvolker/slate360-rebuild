"use client";

import { Check, Flashlight } from "lucide-react";
import type { TwinCaptureMode } from "@/hooks/useTwinCaptureSession";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  hidden?: boolean;
  mode: TwinCaptureMode;
  isRecording: boolean;
  isStreaming: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  hasContent: boolean;
  onTorchToggle: () => void;
  onShutterTap: () => void;
  onDone: () => void;
};

function glassSquareClass() {
  return "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md";
}

export function TwinCaptureBottomRail({
  hidden,
  mode,
  isRecording,
  isStreaming,
  torchSupported,
  torchOn,
  hasContent,
  onTorchToggle,
  onShutterTap,
  onDone,
}: Props) {
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";
  const photosMode = mode === "photos";
  const showRing = photosMode || isRecording;
  const showStopSquare = mode === "video" && isRecording;

  const shutterClass = showRing
    ? "border-[3px] border-[var(--twin360-blue)] bg-transparent shadow-none"
    : "border-[3px] border-[var(--twin360-blue)] bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)]";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <p
        className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium text-[var(--graphite-muted)]"
        style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.hintBottomPx}px + ${safeBottom})` }}
        data-twin-chrome="hint"
      >
        tap square = end clip · check = review
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
              className={`inline-flex items-center justify-center justify-self-start rounded-xl transition active:scale-[0.98] ${glassSquareClass()} ${
                torchOn ? "border-[var(--accent-border-blue)] text-[var(--twin360-blue)]" : ""
              }`}
              style={{
                width: TWIN_CAPTURE_CHROME.lightButtonSizePx,
                height: TWIN_CAPTURE_CHROME.lightButtonSizePx,
              }}
              aria-pressed={torchOn}
              aria-label="Toggle torch"
            >
              <Flashlight className="h-5 w-5" />
            </button>
          ) : (
            <span aria-hidden />
          )}

          <button
            type="button"
            disabled={!isStreaming}
            onClick={onShutterTap}
            data-twin-chrome="shutter"
            className={`inline-flex items-center justify-center justify-self-center rounded-full transition active:scale-95 disabled:opacity-50 ${shutterClass}`}
            style={{
              width: TWIN_CAPTURE_CHROME.shutterSizePx,
              height: TWIN_CAPTURE_CHROME.shutterSizePx,
              marginBottom: TWIN_CAPTURE_CHROME.shutterRaisePx,
            }}
            aria-label={
              photosMode
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
            ) : showRing ? null : (
              <span
                className="rounded-full border-2 border-[color-mix(in_srgb,var(--graphite-canvas)_35%,transparent)] bg-[color-mix(in_srgb,white_18%,var(--twin360-blue))]"
                style={{
                  width: TWIN_CAPTURE_CHROME.shutterInnerPx,
                  height: TWIN_CAPTURE_CHROME.shutterInnerPx,
                }}
              />
            )}
          </button>

          <button
            type="button"
            disabled={!hasContent}
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

        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] text-[11px] leading-none">
          {torchSupported ? (
            <span className="justify-self-start font-medium text-[var(--graphite-muted)]">Light</span>
          ) : (
            <span aria-hidden />
          )}
          <span aria-hidden />
          <span
            className={`justify-self-end font-semibold ${
              hasContent ? "text-[var(--twin360-blue)]" : "text-[var(--graphite-muted)]"
            }`}
          >
            Done
          </span>
        </div>
      </div>
    </div>
  );
}
