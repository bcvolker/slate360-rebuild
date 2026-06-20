"use client";

import { Check, Images, Loader2, MapPin, RefreshCw } from "lucide-react";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import type { GhostPhoto } from "./useGhostProgression";

type Props = {
  hidden?: boolean;
  photos: GhostPhoto[];
  loading: boolean;
  error: string | null;
  usedGps: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDistance(m: number | null): string | null {
  if (m == null) return null;
  if (m < 1) return "here";
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

/**
 * Progression ghost picker — a scrollable strip of prior photos taken near the
 * current spot (across every walk in the project) for before/after capture.
 * Thumbnails are large enough to recognise a location; tap one to overlay it as
 * the ghost frame, then match the angle and re-shoot.
 */
export function CaptureCanvasGhostPicker({
  hidden = false,
  photos,
  loading,
  error,
  usedGps,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  if (hidden) return null;

  return (
    <div
      className={`pointer-events-auto absolute inset-x-2 bottom-[180px] z-20 flex flex-col gap-2 p-2.5 ${captureCanvasGlass.surface} ${captureCanvasGlass.radiusMd}`}
      data-capture-chrome="ghost-picker"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--graphite-text-header)]">
          <Images className="h-3.5 w-3.5" />
          {usedGps ? "Photos near you" : "Photos in this project"}
          {photos.length > 0 ? <span className="text-[var(--graphite-muted)]">· {photos.length}</span> : null}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          aria-label="Refresh nearby photos"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && photos.length === 0 ? (
        <div className="flex h-24 items-center justify-center gap-2 text-[11px] text-[var(--graphite-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding nearby photos…
        </div>
      ) : error ? (
        <div className="flex h-24 items-center justify-center px-3 text-center text-[11px] text-red-300">{error}</div>
      ) : photos.length === 0 ? (
        <div className="flex h-24 items-center justify-center px-3 text-center text-[11px] leading-snug text-[var(--graphite-muted)]">
          No prior photos {usedGps ? "near this spot" : "in this project"} yet. Captured photos appear here for
          before/after comparison.
        </div>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {photos.map((photo) => {
            const selected = photo.id === selectedId;
            const distance = formatDistance(photo.distanceMeters);
            return (
              <li key={photo.id} className="shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(photo.id);
                  }}
                  className={`relative block h-28 w-28 overflow-hidden rounded-xl border-2 transition ${
                    selected
                      ? "border-[var(--graphite-primary)] ring-2 ring-[var(--accent-border-green)]"
                      : "border-white/10 hover:border-white/30"
                  }`}
                  aria-pressed={selected}
                  aria-label={`Ghost overlay from ${formatWhen(photo.capturedAt) || "a prior walk"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="h-full w-full object-cover" draggable={false} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3">
                    <p className="truncate text-[10px] font-semibold text-white">{formatWhen(photo.capturedAt)}</p>
                    <p className="flex items-center gap-1 truncate text-[9px] text-white/70">
                      {distance ? (
                        <>
                          <MapPin className="h-2.5 w-2.5" />
                          {distance}
                        </>
                      ) : (
                        photo.authorName ?? ""
                      )}
                    </p>
                  </div>
                  {selected ? (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-black">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
