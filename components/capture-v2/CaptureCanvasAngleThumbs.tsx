"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAngles, getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CAPTURE_V2_LAYERS } from "./layers";

const HOLD_MS = 550;

type Props = {
  hidden?: boolean;
  item: CaptureItemRecord;
  activeAngleId: string | null;
  onSelectMain: () => void;
  onSelectAngle: (angleId: string) => void;
  onPromoteAngle: (angleId: string) => void;
};

export function CaptureCanvasAngleThumbs({
  hidden,
  item,
  activeAngleId,
  onSelectMain,
  onSelectAngle,
  onPromoteAngle,
}: Props) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const angles = getItemPhotoAngles(item);
  const mainUrl = getCaptureImageUrl(item);

  if (hidden || item.item_type !== "photo") return null;

  function clearHold() {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  return (
    <div
      className={`${CAPTURE_V2_LAYERS.filmstrip} pointer-events-auto absolute left-0 z-20 flex gap-2 overflow-x-auto no-scrollbar px-3`}
      style={{
        top: `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + 8px)`,
        maxWidth: "72%",
      }}
      aria-label="Photo angles"
    >
      <Thumb
        label="Main"
        imageUrl={mainUrl}
        active={!activeAngleId}
        onClick={onSelectMain}
        onHoldStart={() => {}}
        onHoldEnd={clearHold}
      />
      {angles.map((angle) => (
        <Thumb
          key={angle.id}
          label={angle.label}
          imageUrl={getPhotoAngleImageUrl(item, angle.id)}
          active={activeAngleId === angle.id}
          onClick={() => onSelectAngle(angle.id)}
          onHoldStart={() => {
            clearHold();
            holdRef.current = setTimeout(() => {
              onPromoteAngle(angle.id);
              holdRef.current = null;
            }, HOLD_MS);
          }}
          onHoldEnd={clearHold}
        />
      ))}
    </div>
  );
}

function Thumb({
  label,
  imageUrl,
  active,
  onClick,
  onHoldStart,
  onHoldEnd,
}: {
  label: string;
  imageUrl: string | null;
  active: boolean;
  onClick: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const borderClass = active
    ? "border-[var(--accent-border-green)] ring-2 ring-[var(--accent-border-green)]"
    : "border-[var(--surface-zinc-border)]";

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      onPointerLeave={onHoldEnd}
      aria-current={active ? "true" : undefined}
      aria-label={label}
      className={`relative shrink-0 overflow-hidden border bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] p-0 ${borderClass}`}
      style={{
        width: CAPTURE_CANVAS_CHROME.angleThumbPx,
        height: CAPTURE_CANVAS_CHROME.angleThumbPx,
        borderRadius: CAPTURE_CANVAS_CHROME.angleThumbRadiusPx,
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[var(--graphite-muted)]">
          <Camera className="h-4 w-4" />
        </span>
      )}
      <span
        className={`absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-center text-[9px] font-mono font-semibold uppercase tracking-wide ${
          active
            ? "bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] text-[var(--graphite-primary)]"
            : "bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] text-[var(--graphite-muted)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
