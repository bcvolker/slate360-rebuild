"use client";

import { useRef } from "react";
import { Camera, Plus } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAngles, getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

const HOLD_MS = 550;
const THUMB_PX = 56;

type Props = {
  item: CaptureItemRecord;
  activeAngleId: string | null;
  onSelectMain: () => void;
  onSelectAngle: (angleId: string) => void;
  onPromoteAngle: (angleId: string) => void;
  onAddAngle: () => void;
};

export function CaptureV2NoteReviewAngleStrip({
  item,
  activeAngleId,
  onSelectMain,
  onSelectAngle,
  onPromoteAngle,
  onAddAngle,
}: Props) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const angles = getItemPhotoAngles(item);
  const mainUrl = getCaptureImageUrl(item);

  function clearHold() {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  return (
    <div
      className={`${noteReviewTokens.margin} h-[72px] shrink-0 pb-2`}
      data-note-review="angle-strip"
    >
      <div className="flex h-[56px] gap-2 overflow-x-auto no-scrollbar">
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
        <button
          type="button"
          onClick={onAddAngle}
          aria-label="Add another angle"
          className="flex shrink-0 flex-col items-center justify-center border border-dashed border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_70%,transparent)] text-[var(--graphite-muted)]"
          style={{ width: THUMB_PX, height: THUMB_PX, borderRadius: 10 }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
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
    ? "border-[var(--accent-border-green)] ring-1 ring-[var(--accent-border-green)]"
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
      style={{ width: THUMB_PX, height: THUMB_PX, borderRadius: 10 }}
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
            ? "text-[var(--graphite-primary)]"
            : "text-[var(--graphite-muted)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
