"use client";

import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  open: boolean;
  items: CaptureItemRecord[];
  activeItemId: string | null;
  onSelectStop: (item: CaptureItemRecord) => void;
};

/** Horizontal stop switcher under the Data screen header. Tapping a stop flushes
 * the current draft then focuses that stop (drafts persist per stop). */
export function CaptureV2NoteReviewStopStrip({ open, items, activeItemId, onSelectStop }: Props) {
  if (!open || items.length === 0) return null;

  return (
    <div className={`${noteReviewTokens.margin} shrink-0 pb-2`} data-note-review="stop-strip">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {items.map((item, index) => {
          const active = item.id === activeItemId;
          const url = getCaptureImageUrl(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectStop(item)}
              aria-current={active ? "true" : undefined}
              aria-label={`Stop ${index + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border transition ${
                active
                  ? "border-[var(--accent-border-green)] ring-1 ring-[var(--accent-border-green)]"
                  : "border-[var(--surface-zinc-border)] opacity-80"
              }`}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]" />
              )}
              <span
                className={`absolute bottom-0 right-0 rounded-tl-md px-1 text-[9px] font-bold tabular-nums ${
                  active
                    ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
                    : "bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-body)]"
                }`}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
