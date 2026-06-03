"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PlanViewerLeaflet } from "@/components/site-walk/capture/PlanViewerLeaflet";
import { CaptureRegistryThumbnail, ensureCaptureTypesInstalled } from "@/lib/site-walk/capture-types";
import { CAPTURE_CANVAS_SHELL_ENABLED } from "@/lib/site-walk/capture-v2-config";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureCanvasLayer = "plan" | "camera";

export type CaptureCanvasShellProps = {
  loop: CaptureV2Loop;
  sessionId: string;
  layer: CaptureCanvasLayer;
  projectId?: string | null;
  planSets?: SiteWalkPlanSet[];
  planSheets?: SiteWalkPlanSheet[];
  items?: CaptureItemRecord[];
  activeAngleId?: string | null;
  notesFocused?: boolean;
  onSelectItem?: (item: CaptureItemRecord) => void;
  defaultTrackerCollapsed?: boolean;
  onPlanCaptureRequest?: (input: "camera" | "upload") => void;
};

export function CaptureCanvasShell(props: CaptureCanvasShellProps) {
  if (!CAPTURE_CANVAS_SHELL_ENABLED) return null;
  return <CaptureCanvasShellInner {...props} />;
}

function CaptureCanvasShellInner({
  loop,
  sessionId,
  layer,
  projectId = null,
  planSets = [],
  planSheets = [],
  items = [],
  activeAngleId = null,
  notesFocused = false,
  onSelectItem,
  defaultTrackerCollapsed = false,
  onPlanCaptureRequest,
}: CaptureCanvasShellProps) {
  useEffect(() => {
    ensureCaptureTypesInstalled();
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)]">
      <div className={`relative min-h-0 flex-1 ${CAPTURE_V2_LAYERS.canvas}`} id={CAPTURE_V2_LAYER_IDS.canvasBase}>
        {layer === "plan" && projectId ? (
          <PlanViewerLeaflet
            projectId={projectId}
            sessionId={sessionId}
            planSets={planSets}
            sheets={planSheets}
            items={items.length > 0 ? items : loop.items}
            onCaptureRequest={onPlanCaptureRequest}
            onSelectItem={(itemId) => {
              const target = loop.items.find((row) => row.id === itemId);
              if (target) (onSelectItem ?? loop.focusFilmstripItem)(target);
            }}
          />
        ) : (
          <CaptureV2Viewfinder
            sessionId={sessionId}
            loop={loop}
            activeAngleId={activeAngleId}
            notesFocused={notesFocused}
          />
        )}
      </div>

      <CaptureStopTracker
        loop={loop}
        defaultCollapsed={defaultTrackerCollapsed}
        onSelectItem={onSelectItem ?? loop.focusFilmstripItem}
      />
    </div>
  );
}

type TrackerProps = {
  loop: CaptureV2Loop;
  defaultCollapsed: boolean;
  onSelectItem: (item: CaptureItemRecord) => void;
};

function CaptureStopTracker({ loop, defaultCollapsed, onSelectItem }: TrackerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const activeRef = useRef<HTMLDivElement>(null);

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
    if (collapsed) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeKey, collapsed]);

  if (orderedItems.length === 0) return null;

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
          className="flex gap-2 overflow-x-auto px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 no-scrollbar"
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
          })}
        </div>
      )}
    </section>
  );
}
