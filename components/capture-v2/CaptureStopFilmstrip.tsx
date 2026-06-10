"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CaptureStopFilmstripThumb } from "./CaptureStopFilmstripThumb";
import { ensureCaptureTypesInstalled } from "@/lib/site-walk/capture-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureStopFilmstripProps = {
  loop: CaptureV2Loop;
  variant?: "stacked" | "topBar" | "overlay";
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  hidden?: boolean;
  onSelectItem: (item: CaptureItemRecord) => void;
  onDeleteItem?: (item: CaptureItemRecord) => Promise<void>;
  deletingItemId?: string | null;
};

export function CaptureStopFilmstrip({
  loop,
  variant = "stacked",
  defaultCollapsed = false,
  collapsed: collapsedProp,
  hidden = false,
  onSelectItem,
  onDeleteItem,
  deletingItemId = null,
}: CaptureStopFilmstripProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? internalCollapsed;
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
  const nextStopNumber = orderedItems.length + 1;
  const topBar = variant === "topBar";
  const overlay = variant === "overlay";

  useEffect(() => {
    if (collapsed || orderedItems.length === 0) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeKey, collapsed, orderedItems.length]);

  async function handleConfirmDelete() {
    if (!confirmDeleteItem || !onDeleteItem) return;
    await onDeleteItem(confirmDeleteItem);
    setConfirmDeleteItem(null);
  }

  if (hidden) return null;

  const trackerBody = !collapsed && (
    <div
      id="capture-canvas-stop-tracker-scroll"
      className={`flex min-h-0 gap-2 overflow-x-auto no-scrollbar ${
        topBar || overlay
          ? "w-full px-2 py-1"
          : "min-h-[4.75rem] px-3 pb-1.5 pt-1"
      }`}
      style={topBar || overlay ? { minHeight: CAPTURE_CANVAS_CHROME.filmstripThumbPx } : undefined}
      role="listbox"
      aria-label="Stop thumbnails"
    >
      {orderedItems.map((item) => {
        const isActive =
          !!loop.activeItem &&
          (loop.activeItem.id === item.id ||
            (!!loop.activeItem.client_item_id &&
              loop.activeItem.client_item_id === item.client_item_id));
        const stopNumber =
          stopNumbers.get(item.id) ?? stopNumbers.get(item.client_item_id ?? "") ?? 0;
        const previewOverride = isActive && loop.activePreview?.url ? loop.activePreview.url : null;

        return (
          <div
            key={item.client_item_id ?? item.id}
            ref={isActive ? activeRef : undefined}
            role="option"
            aria-selected={isActive}
            className="shrink-0"
          >
            <CaptureStopFilmstripThumb
              item={item}
              stopNumber={stopNumber}
              selected={isActive}
              previewOverride={previewOverride}
              deleting={deletingItemId === item.id}
              overlay={topBar || overlay}
              onSelect={() => onSelectItem(item)}
              onRequestDelete={onDeleteItem ? () => setConfirmDeleteItem(item) : undefined}
            />
          </div>
        );
      })}
      {topBar ? (
        <div
          className="flex shrink-0 items-center justify-center border border-dashed border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] font-mono text-[11px] font-semibold tabular-nums text-[var(--graphite-primary)]"
          style={{
            width: CAPTURE_CANVAS_CHROME.filmstripThumbPx,
            height: CAPTURE_CANVAS_CHROME.filmstripThumbPx,
            borderRadius: CAPTURE_CANVAS_CHROME.filmstripThumbRadiusPx,
          }}
          aria-hidden
        >
          {nextStopNumber}
        </div>
      ) : null}
    </div>
  );

  if (overlay) {
    return (
      <>
        <section
          id="capture-canvas-stop-tracker"
          data-capture-chrome="filmstrip"
          className={`${CAPTURE_V2_LAYERS.filmstrip} pointer-events-auto flex w-full flex-col gap-2 px-3`}
          aria-label="Walk stop tracker"
        >
          {trackerBody}
          <div className={`${captureCanvasGlass.filmstripTrack} flex w-full items-center justify-end`}>
            <button
              type="button"
              onClick={() => setInternalCollapsed((value) => !value)}
              className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] text-[var(--graphite-muted)] backdrop-blur-md transition hover:text-[var(--graphite-text-body)]"
              aria-expanded={!collapsed}
              aria-controls="capture-canvas-stop-tracker-scroll"
              aria-label={collapsed ? "Show stop tracker" : "Hide stop tracker"}
            >
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </section>
        {confirmDeleteItem ? (
          <CaptureStopDeleteDialog
            item={confirmDeleteItem}
            deletingItemId={deletingItemId}
            onCancel={() => setConfirmDeleteItem(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        ) : null}
      </>
    );
  }

  if (topBar) {
    return (
      <>
        <section
          id="capture-canvas-stop-tracker"
          data-capture-chrome="filmstrip"
          className={`${CAPTURE_V2_LAYERS.filmstrip} ${captureCanvasGlass.filmstripTrack} pointer-events-auto w-full`}
          aria-label="Walk stop tracker"
        >
          {trackerBody}
        </section>
        {confirmDeleteItem ? (
          <CaptureStopDeleteDialog
            item={confirmDeleteItem}
            deletingItemId={deletingItemId}
            onCancel={() => setConfirmDeleteItem(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <section
        id="capture-canvas-stop-tracker"
        data-capture-chrome="filmstrip"
        className={`${CAPTURE_V2_LAYERS.filmstrip} shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] backdrop-blur-xl`}
        aria-label="Walk stop tracker"
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Stops · {orderedItems.length}
          </p>
          <button
            type="button"
            onClick={() => setInternalCollapsed((value) => !value)}
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
        {!collapsed && orderedItems.length === 0 ? (
          <div className="flex min-h-[4.75rem] min-w-full items-center justify-center rounded-2xl border border-dashed border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--surface-zinc)_55%,var(--graphite-canvas))] px-4 py-3 text-center">
            <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
              Saved stops appear here as numbered thumbnails.
            </p>
          </div>
        ) : (
          trackerBody
        )}
      </section>

      {confirmDeleteItem ? (
        <CaptureStopDeleteDialog
          item={confirmDeleteItem}
          deletingItemId={deletingItemId}
          onCancel={() => setConfirmDeleteItem(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}
    </>
  );
}

function CaptureStopDeleteDialog({
  item,
  deletingItemId,
  onCancel,
  onConfirm,
}: {
  item: CaptureItemRecord;
  deletingItemId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-delete-stop-title"
        className="w-full max-w-sm rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4 shadow-[var(--mobile-app-card-shadow)]"
      >
        <p id="capture-delete-stop-title" className="text-sm font-bold text-[var(--graphite-text-header)]">
          Delete this stop?
        </p>
        <p className="mt-1 text-xs leading-snug text-[var(--graphite-muted)]">
          This removes the stop and its photo from this walk. This cannot be undone.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] px-3 text-sm font-bold text-[var(--graphite-text-body)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deletingItemId === item.id}
            onClick={onConfirm}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_18%,var(--surface-zinc))] px-3 text-sm font-bold text-[var(--graphite-text-header)] disabled:opacity-50"
          >
            Delete stop
          </button>
        </div>
      </div>
    </div>
  );
}
