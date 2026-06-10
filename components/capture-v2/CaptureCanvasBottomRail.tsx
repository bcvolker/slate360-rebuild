"use client";

import { useRef, type PointerEvent } from "react";
import { ArrowRight, Ghost } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CAPTURE_V2_LAYERS } from "./layers";

const HOLD_MS = 550;
const MOVE_CANCEL_PX = 8;

type Props = {
  busy: boolean;
  hidden?: boolean;
  variant?: "live" | "captured";
  onShutterTap: () => void;
  onShutterHold?: () => void;
  onGhostTap?: () => void;
  onDetailsTap?: () => void;
};

function glassSquareClass(lowEmphasis: boolean) {
  return lowEmphasis
    ? "border border-[color-mix(in_srgb,var(--mobile-app-card-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_48%,transparent)] text-[var(--graphite-muted)] backdrop-blur-md"
    : "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md";
}

export function CaptureCanvasBottomRail({
  busy,
  hidden = false,
  variant = "live",
  onShutterTap,
  onShutterHold,
  onGhostTap,
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
    ? "long-press photo = pin · shutter = next stop"
    : "tap = capture · hold = sources";

  const shutterClass = captured
    ? "border-[3px] border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)] shadow-none"
    : "bg-[var(--graphite-primary)] shadow-[var(--mobile-app-card-glow-primary)]";

  return (
    <div className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-none absolute inset-x-0 bottom-0 z-30`}>
      <p
        className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium text-[var(--graphite-muted)]"
        style={{ bottom: `calc(${CAPTURE_CANVAS_CHROME.hintBottomPx}px + ${safeBottom})` }}
      >
        {hintText}
      </p>

      <div
        className="pointer-events-auto absolute inset-x-0"
        style={{
          bottom: `calc(${CAPTURE_CANVAS_CHROME.railLabelBottomPx}px + ${safeBottom})`,
          paddingLeft: CAPTURE_CANVAS_CHROME.railSideInsetPx,
          paddingRight: CAPTURE_CANVAS_CHROME.railSideInsetPx,
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onGhostTap?.()}
            className={`inline-flex items-center justify-center justify-self-start rounded-xl transition active:scale-[0.98] disabled:opacity-50 ${glassSquareClass(false)}`}
            style={{
              width: CAPTURE_CANVAS_CHROME.ghostButtonSizePx,
              height: CAPTURE_CANVAS_CHROME.ghostButtonSizePx,
            }}
            aria-label="Ghost"
          >
            <Ghost className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleShutterClick}
            onPointerDown={handleShutterPointerDown}
            onPointerMove={handleShutterPointerMove}
            onPointerUp={handleShutterPointerEnd}
            onPointerCancel={handleShutterPointerEnd}
            onPointerLeave={handleShutterPointerEnd}
            className={`inline-flex items-center justify-center justify-self-center rounded-full transition active:scale-95 disabled:opacity-50 ${shutterClass}`}
            style={{
              width: CAPTURE_CANVAS_CHROME.shutterSizePx,
              height: CAPTURE_CANVAS_CHROME.shutterSizePx,
              marginBottom: CAPTURE_CANVAS_CHROME.shutterRaisePx,
            }}
            aria-label={captured ? "Capture next stop" : "Capture photo"}
          >
            <span
              className="rounded-full border-2 border-[var(--graphite-canvas)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)]"
              style={{
                width: CAPTURE_CANVAS_CHROME.shutterInnerPx,
                height: CAPTURE_CANVAS_CHROME.shutterInnerPx,
              }}
            />
          </button>

          {captured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDetailsTap?.()}
              className="inline-flex items-center justify-center justify-self-end rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] shadow-[var(--mobile-app-card-glow-primary)] transition active:scale-[0.98] disabled:opacity-50"
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

        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] text-[11px] leading-none">
          <span className="justify-self-start font-medium text-[var(--graphite-text-body)]">Ghost</span>
          <span aria-hidden />
          {captured ? (
            <span className="justify-self-end font-semibold text-[var(--graphite-primary)]">Details</span>
          ) : (
            <span className="justify-self-end font-medium text-[var(--graphite-muted)]">End</span>
          )}
        </div>
      </div>
    </div>
  );
}
