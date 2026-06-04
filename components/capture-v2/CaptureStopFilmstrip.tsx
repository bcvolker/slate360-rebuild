"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CaptureRegistryThumbnail, ensureCaptureTypesInstalled } from "@/lib/site-walk/capture-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureStopFilmstripProps = {
  loop: CaptureV2Loop;
  defaultCollapsed?: boolean;
  onSelectItem: (item: CaptureItemRecord) => void;
};

export function CaptureStopFilmstrip({
  loop,
  defaultCollapsed = false,
  onSelectItem,
}: CaptureStopFilmstripProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
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

  return (
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
          className="flex min-h-[5.5rem] gap-2 overflow-x-auto px-3 pb-2 pt-1 no-scrollbar"
          role="listbox"
          aria-label="Stop thumbnails"
        >
          {orderedItems.length === 0 ? (
            <div className="flex min-h-[4.75rem] min-w-full items-center justify-center rounded-2xl border border-dashed border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-4 py-3 text-center">
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
                  <CaptureRegistryThumbnail
                    item={item}
                    selected={isActive}
                    stopNumber={stopNumber}
                    imageUrlOverride={previewOverride}
                    onSelect={() => onSelectItem(item)}
                  />
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
