"use client";

import { useEffect, useRef, useState } from "react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { resolveCaptureV2ThumbUrl } from "./capture-v2-preview-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord;
  stopNumber: number;
  selected: boolean;
  previewOverride: string | null;
  deleting: boolean;
  overlay?: boolean;
  onSelect: () => void;
  onRequestDelete?: () => void;
};

export function CaptureStopFilmstripThumb({
  item,
  stopNumber,
  selected,
  previewOverride,
  deleting,
  overlay = false,
  onSelect,
  onRequestDelete,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedUrl = resolveCaptureV2ThumbUrl(item, previewOverride);

  const sizePx = overlay ? CAPTURE_CANVAS_CHROME.filmstripThumbPx : 60;
  const radiusPx = overlay ? CAPTURE_CANVAS_CHROME.filmstripThumbRadiusPx : 8;

  const borderClass = selected
    ? "border-[var(--accent-border-green)] ring-2 ring-[var(--accent-border-green)]"
    : "border-[var(--surface-zinc-border)]";

  useEffect(() => {
    setLoaded(false);
  }, [resolvedUrl]);

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  const showImage = Boolean(resolvedUrl && loaded);

  const thumbVisual = (
    <>
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt=""
          className={`h-full w-full object-cover ${showImage ? "opacity-100" : "opacity-0"}`}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
      {!showImage ? (
        <span className="flex h-full w-full items-center justify-center font-mono text-sm font-semibold tabular-nums text-[var(--graphite-primary)]">
          {stopNumber}
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_45%,transparent)] font-mono text-[11px] font-semibold tabular-nums text-[var(--graphite-text-header)]">
          {stopNumber}
        </span>
      )}
    </>
  );

  if (overlay) {
    return (
      <button
        type="button"
        onClick={onSelect}
        onPointerDown={() => {
          if (!onRequestDelete) return;
          clearLongPress();
          longPressRef.current = setTimeout(() => {
            onRequestDelete();
            longPressRef.current = null;
          }, 550);
        }}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        aria-current={selected ? "true" : undefined}
        aria-label={`Stop ${stopNumber}${onRequestDelete ? ". Hold to delete" : ""}`}
        disabled={deleting}
        className={`relative shrink-0 overflow-hidden border bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] p-0 disabled:opacity-50 ${borderClass}`}
        style={{ width: sizePx, height: sizePx, borderRadius: radiusPx }}
      >
        {thumbVisual}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={() => {
        if (!onRequestDelete) return;
        clearLongPress();
        longPressRef.current = setTimeout(() => {
          onRequestDelete();
          longPressRef.current = null;
        }, 550);
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
      aria-current={selected ? "true" : undefined}
      aria-label={`Stop ${stopNumber}${onRequestDelete ? ". Hold to delete" : ""}`}
      disabled={deleting}
      className="flex shrink-0 flex-col items-center gap-1.5 bg-transparent p-0 disabled:opacity-50"
    >
      <span
        className={`text-[10px] font-bold tabular-nums ${
          selected ? "text-[var(--graphite-primary)]" : "text-[var(--graphite-muted)]"
        }`}
      >
        {stopNumber}
      </span>
      <div
        className={`relative overflow-hidden border ${borderClass}`}
        style={{ width: sizePx, height: sizePx, borderRadius: radiusPx }}
      >
        {thumbVisual}
      </div>
    </button>
  );
}
