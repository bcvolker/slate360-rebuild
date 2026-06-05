"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { resolveCaptureV2ThumbUrl } from "./capture-v2-preview-url";
import { ensureCaptureTypesInstalled } from "@/lib/site-walk/capture-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureStopFilmstripProps = {
  loop: CaptureV2Loop;
  defaultCollapsed?: boolean;
  onSelectItem: (item: CaptureItemRecord) => void;
  onDeleteItem?: (item: CaptureItemRecord) => Promise<void>;
  deletingItemId?: string | null;
};

export function CaptureStopFilmstrip({
  loop,
  defaultCollapsed = false,
  onSelectItem,
  onDeleteItem,
  deletingItemId = null,
}: CaptureStopFilmstripProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<CaptureItemRecord | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureCaptureTypesInstalled();
  }, []);

  const orderedItems = useMemo(
    () => [...loop.items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [loop.items],
  );

  const stopNumbers = useMemo(() => {
    const map = new Map<string, number>();
    orderedItems.forEach((item, index) => {
      map.set(item.id, index + 1);
      if (item.client_item_id) map.set(item.client_item_id, index + 1);
    });
    return map;
  }, [orderedItems]);

  const activeKey = loop.activeItem?.id ?? loop.activeItem?.client_item_id ?? null;

  useEffect(() => {
    if (collapsed || orderedItems.length === 0) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeKey, collapsed, orderedItems.length]);

  async function handleConfirmDelete() {
    if (!confirmDeleteItem || !onDeleteItem) return;
    await onDeleteItem(confirmDeleteItem);
    setConfirmDeleteItem(null);
  }

  return (
    <>
      <section
        id="capture-canvas-stop-tracker"
        className={`${CAPTURE_V2_LAYERS.filmstrip} shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] backdrop-blur-xl`}
        aria-label="Walk stop tracker"
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Stops · {orderedItems.length}
          </p>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--graphite-muted)] transition hover:border-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)] hover:text-[var(--graphite-text-body)]"
            aria-expanded={!collapsed}
            aria-controls="capture-canvas-stop-tracker-scroll"
          >
            {collapsed ? (
              <>
                Show <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Hide <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {!collapsed && (
          <div
            id="capture-canvas-stop-tracker-scroll"
            className="flex min-h-[5.5rem] gap-3 overflow-x-auto px-3 pb-2 pt-1 no-scrollbar"
            role="listbox"
            aria-label="Stop thumbnails"
          >
            {orderedItems.length === 0 ? (
              <div className="flex min-h-[4.75rem] min-w-full items-center justify-center rounded-2xl border border-dashed border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--surface-zinc)_55%,var(--graphite-canvas))] px-4 py-3 text-center">
                <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
                  Saved stops appear here as numbered thumbnails.
                </p>
              </div>
            ) : (
              orderedItems.map((item) => {
                const isActive =
                  !!loop.activeItem &&
                  (loop.activeItem.id === item.id ||
                    (!!loop.activeItem.client_item_id &&
                      loop.activeItem.client_item_id === item.client_item_id));
                const stopNumber =
                  stopNumbers.get(item.id) ?? stopNumbers.get(item.client_item_id ?? "") ?? 0;
                const previewOverride =
                  isActive && loop.activePreview?.url ? loop.activePreview.url : null;

                return (
                  <div
                    key={item.client_item_id ?? item.id}
                    ref={isActive ? activeRef : undefined}
                    role="option"
                    aria-selected={isActive}
                    className="shrink-0"
                  >
                    <StopFilmstripThumb
                      item={item}
                      stopNumber={stopNumber}
                      selected={isActive}
                      previewOverride={previewOverride}
                      deleting={deletingItemId === item.id}
                      onSelect={() => onSelectItem(item)}
                      onRequestDelete={onDeleteItem ? () => setConfirmDeleteItem(item) : undefined}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {confirmDeleteItem ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="capture-delete-stop-title"
            className="w-full max-w-sm rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4 shadow-[var(--mobile-app-card-shadow)]"
          >
            <p
              id="capture-delete-stop-title"
              className="text-sm font-bold text-[var(--graphite-text-header)]"
            >
              Delete this stop?
            </p>
            <p className="mt-1 text-xs leading-snug text-[var(--graphite-muted)]">
              This removes the stop and its photo from this walk. This cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] px-3 text-sm font-bold text-[var(--graphite-text-body)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingItemId === confirmDeleteItem.id}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_18%,var(--surface-zinc))] px-3 text-sm font-bold text-[var(--graphite-text-header)] disabled:opacity-50"
              >
                Delete stop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type ThumbProps = {
  item: CaptureItemRecord;
  stopNumber: number;
  selected: boolean;
  previewOverride: string | null;
  deleting: boolean;
  onSelect: () => void;
  onRequestDelete?: () => void;
};

function StopFilmstripThumb({
  item,
  stopNumber,
  selected,
  previewOverride,
  deleting,
  onSelect,
  onRequestDelete,
}: ThumbProps) {
  const [failed, setFailed] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedUrl = resolveCaptureV2ThumbUrl(item, previewOverride);
  const borderClass = selected
    ? "border-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]"
    : "border-[var(--surface-zinc-border)]";

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
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
        className={`h-[3.75rem] w-[3.75rem] overflow-hidden rounded-lg border ${borderClass}`}
      >
        {resolvedUrl && !failed ? (
          <img
            src={resolvedUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--graphite-muted)]">
            <Camera className="h-4 w-4" />
          </div>
        )}
      </div>
    </button>
  );
}
