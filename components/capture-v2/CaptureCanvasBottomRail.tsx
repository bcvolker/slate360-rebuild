"use client";

import { useRef, type PointerEvent } from "react";
import { ArrowRight, Flashlight, Ghost } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CAPTURE_V2_LAYERS } from "./layers";

const HOLD_MS = 550;
const MOVE_CANCEL_PX = 8;
const SHUTTER_RING_PX = (CAPTURE_CANVAS_CHROME.shutterSizePx - CAPTURE_CANVAS_CHROME.shutterInnerPx) / 2;

type Props = {
  busy: boolean;
  hidden?: boolean;
  variant?: "live" | "captured";
  captureBlocked?: boolean;
  torchSupported?: boolean;
  torchOn?: boolean;
  onTorchToggle?: () => void;
  onShutterTap: () => void;
  onShutterHold?: () => void;
  onGhostTap?: () => void;
  onEndTap?: () => void;
  onDetailsTap?: () => void;
};

function glassSquareClass(lowEmphasis: boolean, active = false) {
  if (active) {
    return "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)] ring-2 ring-[var(--accent-border-green)] backdrop-blur-md";
  }
  return lowEmphasis
    ? `border border-[color-mix(in_srgb,var(--mobile-app-card-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] text-[var(--graphite-muted)] backdrop-blur-md`
    : `border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md`;
}

export function CaptureCanvasBottomRail({
  busy,
  hidden = false,
  variant = "live",
  captureBlocked = false,
  torchSupported = false,
  torchOn = false,
  onTorchToggle,
  onShutterTap,
  onShutterHold,
  onGhostTap,
  onEndTap,
  onDetailsTap,
}: Props) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFiredRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const captured = variant === "captured";

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function handleShutterPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (captured) return;
    holdFiredRef.current = false;
    originRef.current = { x: event.clientX, y: event.clientY };
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      holdFiredRef.current = true;
      onShutterHold?.();
    }, HOLD_MS);
  }

  function handleShutterPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const origin = originRef.current;
    if (!origin || !holdTimerRef.current) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  }

  function handleShutterPointerEnd() {
    clearHoldTimer();
    originRef.current = null;
  }

  function handleShutterClick() {
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      return;
    }
    onShutterTap();
  }

  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";
  const hintText = captured
    ? "long-press = attach here · shutter = next stop"
    : captureBlocked
      ? "camera not ready — wait or tap resume"
      : "tap = capture · hold = sources";

  const liveShutterClass = captureBlocked
    ? "border-2 border-[var(--graphite-muted)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] opacity-60"
    : "bg-[var(--graphite-primary)] shadow-none border-0";
  const capturedShutterClass =
    "border-[3px] border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)] shadow-none";

  return (
    <div className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-none absolute inset-x-0 bottom-0 z-30`}>
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ bottom: `calc(${CAPTURE_CANVAS_CHROME.hintBottomPx}px + ${safeBottom})` }}
      >
        <p className={`${captureCanvasGlass.hintChip} text-[11px] font-medium text-[var(--graphite-muted)]`}>
          {hintText}
        </p>
      </div>

      <div
        className="pointer-events-auto absolute inset-x-0"
        style={{
          bottom: `calc(${CAPTURE_CANVAS_CHROME.railLabelBottomPx}px + ${safeBottom})`,
          paddingLeft: CAPTURE_CANVAS_CHROME.railSideInsetPx,
          paddingRight: CAPTURE_CANVAS_CHROME.railSideInsetPx,
        }}
        data-capture-chrome="bottom-rail"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <div className="flex flex-col items-start gap-2 justify-self-start">
            {!captured && torchSupported ? (
              <button
                type="button"
                onClick={() => onTorchToggle?.()}
                data-capture-chrome="light-button"
                className={`inline-flex items-center justify-center rounded-xl transition active:scale-[0.98] ${glassSquareClass(false, torchOn)}`}
                style={{
                  width: CAPTURE_CANVAS_CHROME.lightButtonSizePx,
                  height: CAPTURE_CANVAS_CHROME.lightButtonSizePx,
                }}
                aria-pressed={torchOn}
                aria-label={torchOn ? "Turn light off" : "Turn light on"}
              >
                <Flashlight className="h-5 w-5" />
              </button>
            ) : null}
            {!captured ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onGhostTap?.()}
                data-capture-chrome="ghost-button"
                className={`inline-flex items-center justify-center rounded-xl transition active:scale-[0.98] disabled:opacity-50 ${glassSquareClass(false)}`}
                style={{
                  width: CAPTURE_CANVAS_CHROME.ghostButtonSizePx,
                  height: CAPTURE_CANVAS_CHROME.ghostButtonSizePx,
                }}
                aria-label="Hide controls"
              >
                <Ghost className="h-5 w-5" />
              </button>
            ) : (
              <span aria-hidden />
            )}
          </div>

          <button
            type="button"
            disabled={busy || (!captured && captureBlocked)}
            onClick={handleShutterClick}
            onPointerDown={handleShutterPointerDown}
            onPointerMove={handleShutterPointerMove}
            onPointerUp={handleShutterPointerEnd}
            onPointerCancel={handleShutterPointerEnd}
            onPointerLeave={handleShutterPointerEnd}
            data-capture-chrome="shutter"
            className={`inline-flex items-center justify-center justify-self-center rounded-full transition active:scale-95 disabled:opacity-50 ${
              captured ? capturedShutterClass : liveShutterClass
            }`}
            style={{
              width: CAPTURE_CANVAS_CHROME.shutterSizePx,
              height: CAPTURE_CANVAS_CHROME.shutterSizePx,
              marginBottom: CAPTURE_CANVAS_CHROME.shutterRaisePx,
            }}
            aria-label={captured ? "Capture next stop" : "Capture photo"}
          >
            <span
              className="rounded-full border-[var(--graphite-canvas)] bg-transparent"
              style={{
                width: CAPTURE_CANVAS_CHROME.shutterInnerPx,
                height: CAPTURE_CANVAS_CHROME.shutterInnerPx,
                borderWidth: SHUTTER_RING_PX,
              }}
            />
          </button>

          {captured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDetailsTap?.()}
              data-capture-chrome="end-button"
              className="inline-flex items-center justify-center justify-self-end rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] shadow-none transition active:scale-[0.98] disabled:opacity-50"
              style={{
                width: CAPTURE_CANVAS_CHROME.detailsButtonPx,
                height: CAPTURE_CANVAS_CHROME.detailsButtonPx,
              }}
              aria-label="Stop details"
            >
              <ArrowRight className="h-6 w-6" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onEndTap?.()}
              data-capture-chrome="end-button"
              className={`inline-flex items-center justify-center justify-self-end rounded-xl transition active:scale-[0.98] disabled:opacity-50 ${glassSquareClass(true)}`}
              style={{
                width: CAPTURE_CANVAS_CHROME.endButtonSizePx,
                height: CAPTURE_CANVAS_CHROME.endButtonSizePx,
              }}
              aria-label="End walk"
            >
              <span className="h-3.5 w-3.5 rounded-sm border border-[var(--graphite-muted)]" />
            </button>
          )}
        </div>

        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] gap-1 text-[10px] leading-none">
          <div className="flex max-w-full flex-col items-start gap-1 justify-self-start">
            {!captured && torchSupported ? (
              <span className={`${captureCanvasGlass.labelChip} w-full max-w-[52px] font-medium text-[var(--graphite-text-body)]`}>
                Light
              </span>
            ) : null}
            {!captured ? (
              <span className={`${captureCanvasGlass.labelChip} w-full max-w-[52px] font-medium text-[var(--graphite-text-body)]`}>
                Ghost
              </span>
            ) : null}
          </div>
          <span aria-hidden />
          {captured ? (
            <span className={`${captureCanvasGlass.labelChip} justify-self-end font-semibold text-[var(--graphite-primary)]`}>
              Details
            </span>
          ) : (
            <span className={`${captureCanvasGlass.labelChip} justify-self-end font-medium text-[var(--graphite-muted)]`}>
              End
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
