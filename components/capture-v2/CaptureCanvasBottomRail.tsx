"use client";

import { useRef, type PointerEvent } from "react";
import { ArrowRight, Check, Flashlight } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CAPTURE_V2_LAYERS } from "./layers";

const HOLD_MS = 550;
const MOVE_CANCEL_PX = 8;
const SHUTTER_RING_PX = (CAPTURE_CANVAS_CHROME.shutterSizePx - CAPTURE_CANVAS_CHROME.shutterInnerPx) / 2;
const BTN = CAPTURE_CANVAS_CHROME.railButtonSizePx;

type Props = {
  busy: boolean;
  hidden?: boolean;
  variant?: "live" | "captured";
  captureBlocked?: boolean;
  torchSupported?: boolean;
  torchOn?: boolean;
  endProminent?: boolean;
  onTorchToggle?: () => void;
  onShutterTap: () => void;
  onShutterHold?: () => void;
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

function RailToolStack({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center" style={{ gap: CAPTURE_CANVAS_CHROME.labelGapPx }}>
      {children}
      <span className={`${captureCanvasGlass.labelChip} text-[11px] font-medium text-[var(--graphite-text-body)]`}>
        {label}
      </span>
    </div>
  );
}

export function CaptureCanvasBottomRail({
  busy,
  hidden = false,
  variant = "live",
  captureBlocked = false,
  torchSupported = false,
  torchOn = false,
  endProminent = false,
  onTorchToggle,
  onShutterTap,
  onShutterHold,
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
    ? "long-press = drop pin · arrow = details"
    : captureBlocked
      ? "camera not ready — wait or tap resume"
      : "tap = capture · hold = sources";

  const shutterRowBottom = `calc(${CAPTURE_CANVAS_CHROME.hintSafeAreaPx}px + ${CAPTURE_CANVAS_CHROME.hintChipHeightPx}px + ${CAPTURE_CANVAS_CHROME.shutterHintGapPx}px + ${safeBottom})`;
  const hintBottom = `calc(${CAPTURE_CANVAS_CHROME.hintSafeAreaPx}px + ${safeBottom})`;

  const liveShutterClass = captureBlocked
    ? "border-2 border-[var(--graphite-muted)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] opacity-60"
    : "bg-[var(--graphite-primary)] shadow-none border-0";
  const capturedShutterClass =
    "border-[3px] border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)] shadow-none";

  if (captured) {
    return (
      <div className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-none absolute inset-x-0 bottom-0 z-30`}>
        <div
          className="pointer-events-auto absolute inset-x-0"
          style={{
            bottom: hintBottom,
            paddingLeft: CAPTURE_CANVAS_CHROME.railSideInsetPx,
            paddingRight: CAPTURE_CANVAS_CHROME.railSideInsetPx,
          }}
          data-capture-chrome="bottom-rail"
        >
          {/* Step strip — makes the Capture → Add info → Done sequence unmistakable */}
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em]">
            <span className="text-[var(--graphite-primary)]">✓ Capture</span>
            <span className="h-px w-5 bg-[var(--mobile-app-card-border)]" />
            <span className="text-[var(--graphite-text-header)]">Add info</span>
            <span className="h-px w-5 bg-[var(--mobile-app-card-border)]" />
            <span className="text-[var(--graphite-muted)]">Done</span>
          </div>

          {/* Primary: full-width, verb-first — the #1 discoverability fix (was a tiny "Details" arrow). */}
          <button
            type="button"
            disabled={busy}
            onClick={() => onDetailsTap?.()}
            data-capture-chrome="details-button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-4 text-[15px] font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99] disabled:opacity-50"
            style={{ minHeight: 48 }}
            aria-label="Add information for this stop"
          >
            Add info
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>

          {/* Secondary: take another photo for this stop (demoted from the prominent shutter). */}
          <div className="mt-2 flex items-center justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={handleShutterClick}
              data-capture-chrome="shutter"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--graphite-muted)] transition active:scale-[0.98] disabled:opacity-50"
              aria-label="Add another photo to this stop"
            >
              <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--graphite-muted)]" />
              Add another photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-none absolute inset-x-0 bottom-0 z-30`}>
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ bottom: hintBottom }}
        data-capture-chrome="hint"
      >
        <p className={`${captureCanvasGlass.hintChip} text-[11px] font-medium text-[var(--graphite-muted)]`}>
          {hintText}
        </p>
      </div>

      <div
        className="pointer-events-auto absolute inset-x-0"
        style={{
          bottom: shutterRowBottom,
          paddingLeft: CAPTURE_CANVAS_CHROME.railSideInsetPx,
          paddingRight: CAPTURE_CANVAS_CHROME.railSideInsetPx,
        }}
        data-capture-chrome="bottom-rail"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <div className="justify-self-start">
            {!captured && torchSupported ? (
              <RailToolStack label="Light">
                <button
                  type="button"
                  onClick={() => onTorchToggle?.()}
                  data-capture-chrome="light-button"
                  className={`inline-flex items-center justify-center rounded-xl transition active:scale-[0.98] ${glassSquareClass(false, torchOn)}`}
                  style={{ width: BTN, height: BTN }}
                  aria-pressed={torchOn}
                  aria-label={torchOn ? "Turn light off" : "Turn light on"}
                >
                  <Flashlight className="h-5 w-5" />
                </button>
              </RailToolStack>
            ) : null}
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

          <div className="justify-self-end">
            {captured ? (
              <RailToolStack label="Details">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDetailsTap?.()}
                  data-capture-chrome="details-button"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] transition active:scale-[0.98] disabled:opacity-50"
                  style={{
                    width: CAPTURE_CANVAS_CHROME.endButtonSizePx,
                    height: CAPTURE_CANVAS_CHROME.endButtonSizePx,
                  }}
                  aria-label="Stop details"
                >
                  <ArrowRight className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </RailToolStack>
            ) : (
              <RailToolStack label="End walk">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onEndTap?.()}
                  data-capture-chrome="end-button"
                  data-capture-chrome-prominent={endProminent ? "true" : "false"}
                  className={`inline-flex items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] transition active:scale-[0.98] disabled:pointer-events-none ${
                    endProminent ? "" : "opacity-35"
                  }`}
                  style={{
                    width: CAPTURE_CANVAS_CHROME.endButtonSizePx,
                    height: CAPTURE_CANVAS_CHROME.endButtonSizePx,
                  }}
                  aria-label="End walk"
                >
                  <Check className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </RailToolStack>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
