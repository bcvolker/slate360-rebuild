"use client";

import dynamic from "next/dynamic";
import { Camera, MapPin, Orbit, Paperclip, Plus, Trash2, X } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { PlanViewerPin } from "@/components/site-walk/capture/PlanPin";

// 360 viewer touches window on import — load client-only, same pattern as the
// site-walk item viewer.
const TourPanoViewer = dynamic(
  () => import("@/components/tours/TourPanoViewer").then((m) => m.TourPanoViewer),
  { ssr: false },
);

type Props = {
  open: boolean;
  pin: PlanViewerPin | null;
  item: CaptureItemRecord | null;
  onClose: () => void;
  onOpenDetails: () => void;
  /** Empty pin: open the capture source picker (camera / upload / 360) for this pin. */
  onCaptureInto: () => void;
  /** Remove this pin from the drawing. */
  onDelete: () => void;
  deleting?: boolean;
};

function typeBadge(itemType: CaptureItemRecord["item_type"] | undefined) {
  switch (itemType) {
    case "photo_360":
      return { label: "360° Photo", Icon: Orbit, className: "text-[var(--twin360-blue)]" };
    case "file_attachment":
      return { label: "File", Icon: Paperclip, className: "text-[var(--graphite-muted)]" };
    default:
      return { label: "Photo", Icon: Camera, className: "text-[var(--graphite-primary)]" };
  }
}

export function CapturePlanPinDetailSheet({ open, pin, item, onClose, onOpenDetails, onCaptureInto, onDelete, deleting = false }: Props) {
  if (!open || !pin) return null;

  const itemType = item?.item_type;
  const mediaUrl = item ? getCaptureImageUrl(item) : null;
  const isEmpty = !item;
  const noteSnippet = isEmpty ? "No capture yet — add a photo, file, or 360." : item?.description?.trim() || item?.title?.trim() || "No note yet";
  const badge = isEmpty ? { label: "Empty pin", Icon: MapPin, className: "text-[var(--graphite-muted)]" } : typeBadge(itemType);
  const is360 = itemType === "photo_360";
  const isFile = itemType === "file_attachment";

  return (
    <div className="pointer-events-none fixed inset-0 z-[2000] flex items-end justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <button
        type="button"
        aria-label="Close pin details"
        onClick={onClose}
        className="pointer-events-auto absolute inset-0 cursor-default bg-transparent"
      />
      <div
        className="pointer-events-auto relative w-full max-w-sm rounded-[1.25rem] border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-4 text-left shadow-2xl backdrop-blur-xl"
        data-capture-chrome="plan-pin-detail-sheet"
        data-pin-item-type={itemType ?? "empty"}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
              <badge.Icon className="h-3 w-3" strokeWidth={2.5} />
              Stop {pin.label} · {badge.label}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--graphite-text-body)]">{noteSnippet}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--graphite-muted)] hover:bg-white/5"
            aria-label="Close pin details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {is360 && mediaUrl ? (
          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-lg border border-[var(--accent-border-blue)]">
            <TourPanoViewer src={mediaUrl} />
            <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              Drag to look around
            </span>
          </div>
        ) : isFile ? (
          <div className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]">
            <Paperclip className="h-7 w-7" strokeWidth={1.75} />
            <span className="text-xs font-medium">File attached — open details to view</span>
          </div>
        ) : mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className="mt-3 aspect-[4/3] w-full rounded-lg border border-[var(--mobile-app-card-border)] object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={onCaptureInto}
            className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--accent-border-green)] text-[var(--graphite-primary)] transition active:scale-[0.99]"
          >
            <Plus className="h-7 w-7" strokeWidth={2} />
            <span className="text-xs font-semibold">Tap to capture here</span>
          </button>
        )}

        {isEmpty ? (
          <button
            type="button"
            onClick={onCaptureInto}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--graphite-primary)] text-sm font-semibold text-[var(--graphite-canvas)]"
          >
            <Camera className="h-4 w-4" strokeWidth={2.25} /> Add capture
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDetails}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-semibold text-[var(--graphite-canvas)]"
          >
            Open details
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--destructive)_45%,transparent)] text-sm font-semibold text-[var(--destructive)] disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} /> {deleting ? "Removing…" : "Remove pin"}
        </button>
      </div>
    </div>
  );
}
