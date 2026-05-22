"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import { SITE_WALK_OFFLINE_EVENT } from "@/lib/site-walk/offline-db";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2ItemThumb } from "./CaptureV2ItemThumb";
import { CaptureV2SessionSyncBadge } from "./CaptureV2SyncBadge";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
  onSelectItem: (item: CaptureItemRecord) => void;
};

export function CaptureV2Filmstrip({ loop, onSelectItem }: Props) {
  const { isOnline, isSyncing, pendingUploadCount, syncOfflineItems } = useSiteWalkSession();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [queueTick, setQueueTick] = useState(0);

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
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshQueue = () => {
      setQueueTick((value) => value + 1);
      if (navigator.onLine) void syncOfflineItems();
    };
    window.addEventListener(SITE_WALK_OFFLINE_EVENT, refreshQueue);
    return () => window.removeEventListener(SITE_WALK_OFFLINE_EVENT, refreshQueue);
  }, [syncOfflineItems]);

  void queueTick;

  if (orderedItems.length === 0) return null;

  return (
    <section
      id={CAPTURE_V2_LAYER_IDS.filmstrip}
      className={`${CAPTURE_V2_LAYERS.filmstrip} relative shrink-0 border-t border-white/5 bg-slate-950/92 backdrop-blur-xl`}
      aria-label="Captured stops filmstrip"
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Session stops · {orderedItems.length}
        </p>
        <CaptureV2SessionSyncBadge
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingUploadCount={pendingUploadCount}
          className="hidden sm:inline-flex"
        />
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 no-scrollbar"
        role="listbox"
        aria-label="Walk stop thumbnails"
      >
        {orderedItems.map((item) => {
          const isActive =
            !!loop.activeItem &&
            (loop.activeItem.id === item.id ||
              (!!loop.activeItem.client_item_id &&
                loop.activeItem.client_item_id === item.client_item_id));
          const stopNumber = stopNumbers.get(item.id) ?? stopNumbers.get(item.client_item_id ?? "") ?? 0;
          const previewOverride =
            isActive && loop.activePreview?.url ? loop.activePreview.url : null;

          return (
            <div
              key={item.client_item_id ?? item.id}
              ref={isActive ? activeRef : undefined}
              className="shrink-0"
              role="option"
              aria-selected={isActive}
            >
              <CaptureV2ItemThumb
                item={item}
                stopNumber={stopNumber}
                isActive={isActive}
                isOnline={isOnline}
                saveState={isActive ? loop.saveState : undefined}
                detailsSaving={isActive ? loop.detailsSaving : undefined}
                detailSaveError={isActive ? loop.detailSaveError : undefined}
                imageUrlOverride={previewOverride}
                onSelect={() => onSelectItem(item)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

