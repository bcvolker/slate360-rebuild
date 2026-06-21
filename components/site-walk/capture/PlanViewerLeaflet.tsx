"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { ImageOverlay, MapContainer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { createPlanPinMarkerIcon } from "@/components/capture-v2/plan-canvas/plan-pin-marker-icon";
import { capturePlanFitPadding } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { fitPlanLeafletMap } from "@/lib/site-walk/plan-leaflet-fit";
import type { SiteWalkItemType, SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { LayerFilter } from "./plan-layer-types";
import type { PlanViewerPin } from "./PlanPin";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { PlanToolbar } from "./PlanToolbar";
import { PlanViewerLeafletEvents, type PlanPinDropPayload } from "./PlanViewerLeafletEvents";
import type { PlanPage, QuickMenuState } from "./planViewerModel";
import { usePlanViewerLeafletPins } from "./usePlanViewerLeafletPins";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null; thumbnail_url?: string | null; item_type?: SiteWalkItemType | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
  onPinDropped?: (payload: PlanPinDropPayload) => void;
  onSessionPinTap?: (pin: PlanViewerPin) => void;
  hideToolbar?: boolean;
  pageIndex?: number;
  onPageIndexChange?: (index: number) => void;
  sheetImageUrls?: Record<string, string>;
  fitPadding?: ReturnType<typeof capturePlanFitPadding>;
  allowPinPlacement?: boolean;
  useSourcePickerFlow?: boolean;
  pinRefreshKey?: number;
  devExposeMap?: boolean;
};

function pinToLatLng(pin: { x_pct: number; y_pct: number }, width: number, height: number): L.LatLngExpression {
  return [(pin.y_pct / 100) * height, (pin.x_pct / 100) * width];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function PlanViewerLeaflet({
  projectId,
  sessionId = "current-session",
  planSets = [],
  sheets = [],
  items = [],
  onCaptureRequest,
  onSelectItem,
  onPinDropped,
  onSessionPinTap,
  hideToolbar = false,
  pageIndex: controlledPageIndex,
  onPageIndexChange,
  sheetImageUrls,
  fitPadding,
  allowPinPlacement = true,
  useSourcePickerFlow = false,
  pinRefreshKey = 0,
  devExposeMap = false,
}: Props) {
  const [internalPageIndex, setInternalPageIndex] = useState(0);
  const [filter, setFilter] = useState<LayerFilter>("all");
  const [quickMenu, setQuickMenu] = useState<QuickMenuState>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageIndex = controlledPageIndex ?? internalPageIndex;
  const setPageIndex = onPageIndexChange ?? setInternalPageIndex;
  const padding = fitPadding ?? capturePlanFitPadding();

  const activePlanSet = useMemo(
    () => planSets.find((ps) => ps.processing_status === "ready") ?? planSets[0] ?? null,
    [planSets],
  );
  const planSheets = useMemo(
    () =>
      activePlanSet
        ? [...sheets.filter((s) => s.plan_set_id === activePlanSet.id)].sort(
            (a, b) => a.sort_order - b.sort_order || a.sheet_number - b.sheet_number,
          )
        : [],
    [activePlanSet, sheets],
  );
  const pages = useMemo<PlanPage[]>(
    () =>
      planSheets.map((sheet, index) => ({
        key: sheet.id,
        label: sheet.sheet_name?.trim() || `Sheet ${sheet.sheet_number}`,
        pageNumber: index + 1,
        sheetId: sheet.id,
      })),
    [planSheets],
  );
  const safePageIndex = pages.length > 0 ? Math.min(pageIndex, pages.length - 1) : 0;
  const activePage = pages[safePageIndex] ?? null;
  const activeSheet = planSheets.find((s) => s.id === activePage?.sheetId) ?? null;
  const hasRasterized = Boolean(activeSheet?.rasterized_key && activeSheet.rasterized_width && activeSheet.rasterized_height);
  const imageWidth = activeSheet?.rasterized_width ?? 2048;
  const imageHeight = activeSheet?.rasterized_height ?? 1448;
  const imageUrl =
    activeSheet && sheetImageUrls?.[activeSheet.id]
      ? sheetImageUrls[activeSheet.id]
      : activeSheet?.rasterized_key
        ? `/api/site-walk/plan-sheets/${activeSheet.id}/image`
        : null;
  // item_id → item_type, so a captured pin can be colored/badged by what it holds
  // (photo / 360 / file). Pins with no matching item fall back to the photo look.
  const itemTypeById = useMemo(() => {
    const map = new Map<string, SiteWalkItemType>();
    for (const item of items) {
      if (item.id && item.item_type) map.set(item.id, item.item_type);
    }
    return map;
  }, [items]);

  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [[0, 0], [imageHeight, imageWidth]],
    [imageHeight, imageWidth],
  );

  const { pins, setPins, persistPin } = usePlanViewerLeafletPins({
    planSheetId: activePage?.sheetId,
    sessionId,
    projectId,
    pinRefreshKey,
  });

  const refitMap = useCallback(() => {
    const map = mapRef.current;
    if (!map || !hasRasterized) return;
    fitPlanLeafletMap(map, activeSheet, imageWidth, imageHeight, padding);
  }, [activeSheet, hasRasterized, imageHeight, imageWidth, padding]);

  useEffect(() => {
    refitMap();
  }, [activeSheet?.id, hasRasterized, refitMap]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => refitMap());
    observer.observe(node);
    return () => observer.disconnect();
  }, [refitMap]);

  const visiblePins = pins.filter((pin) => {
    if (filter === "none") return false;
    if (filter === "current") return pin.session_id === sessionId;
    return true;
  });

  const handleMapCreated = useCallback(
    (map: L.Map | null) => {
      if (!map) return;
      mapRef.current = map;
      if (devExposeMap && typeof window !== "undefined") {
        const win = window as Window & {
          __devPlanLeafletMap?: L.Map;
          __devPlanImageSize?: { width: number; height: number };
        };
        win.__devPlanLeafletMap = map;
        win.__devPlanImageSize = { width: imageWidth, height: imageHeight };
      }
      if (hasRasterized) fitPlanLeafletMap(map, activeSheet, imageWidth, imageHeight, padding);
    },
    [activeSheet, devExposeMap, hasRasterized, imageHeight, imageWidth, padding],
  );

  const handleMarkerTap = useCallback(
    (pin: PlanViewerPin) => {
      if (pin.session_id !== sessionId) return;
      // Source-picker flow (walks with drawings) routes ALL taps — captured pins
      // open their detail sheet, empty pins open the capture/delete sheet. Legacy
      // flow keeps the quick-action menu for empty pins.
      if (onSessionPinTap && (pin.item_id || useSourcePickerFlow)) {
        onSessionPinTap(pin);
        return;
      }
      if (useSourcePickerFlow) return;
      setQuickMenu({
        pinId: isUuid(pin.id) ? pin.id : null,
        clientPinId: pin.client_pin_id ?? pin.id,
        xPct: pin.x_pct,
        yPct: pin.y_pct,
        isSavedPin: Boolean(pin.item_id),
      });
    },
    [onSessionPinTap, sessionId, useSourcePickerFlow],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 select-none overflow-hidden bg-black text-white" style={{ WebkitTouchCallout: "none" }}>
      {hasRasterized && imageUrl ? (
        <MapContainer
          key={activeSheet?.id ?? "plan-map"}
          crs={L.CRS.Simple}
          bounds={bounds}
          maxBounds={L.latLngBounds([[-imageHeight * 0.1, -imageWidth * 0.1], [imageHeight * 1.1, imageWidth * 1.1]])}
          maxBoundsViscosity={0.8}
          zoomSnap={0.25}
          zoomDelta={0.5}
          minZoom={-2}
          maxZoom={4}
          attributionControl={false}
          zoomControl={false}
          className="h-full w-full"
          style={{ background: "#000" }}
          ref={handleMapCreated}
        >
          <ImageOverlay url={imageUrl} bounds={bounds} />
          {allowPinPlacement ? (
            <PlanViewerLeafletEvents
              toolMode="pan"
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              sessionId={sessionId}
              planSheetId={activePage?.sheetId ?? ""}
              pins={pins}
              setPins={setPins}
              setQuickMenu={setQuickMenu}
              onPinDropped={onPinDropped}
              onPersistPin={persistPin}
              useSourcePickerFlow={useSourcePickerFlow}
            />
          ) : null}
          {visiblePins.map((pin) => {
            const currentSession = pin.session_id === sessionId;
            const captured = Boolean(pin.item_id);
            return (
              <Marker
                key={pin.client_pin_id ?? pin.id}
                position={pinToLatLng(pin, imageWidth, imageHeight)}
                icon={createPlanPinMarkerIcon({
                  label: pin.label,
                  currentSession,
                  captured,
                  xPct: pin.x_pct,
                  yPct: pin.y_pct,
                  itemType: pin.item_id ? itemTypeById.get(pin.item_id) ?? null : null,
                })}
                eventHandlers={
                  currentSession
                    ? {
                        click: () => handleMarkerTap(pin),
                      }
                    : undefined
                }
              />
            );
          })}
        </MapContainer>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-black text-white">Loading plan…</p>
          <p className="text-xs font-semibold text-slate-400">
            {!activePlanSet ? "No plan sets found for this project." : "Plan is being processed. The image will appear shortly."}
          </p>
        </div>
      )}

      {!hideToolbar ? (
        <PlanToolbar
          fileUrl={null}
          pages={pages.map((p) => ({ key: p.key, label: p.label, pageNumber: p.pageNumber }))}
          activeIndex={safePageIndex}
          zoomPercent={mapRef.current ? Math.round(Math.pow(2, mapRef.current.getZoom()) * 100) : 100}
          filter={filter}
          pinCount={visiblePins.length}
          onSelect={setPageIndex}
          onZoom={(delta) => {
            if (!mapRef.current) return;
            if (delta > 0) mapRef.current.zoomIn(0.5);
            else mapRef.current.zoomOut(0.5);
          }}
          onChangeFilter={setFilter}
        />
      ) : null}

      {quickMenu && !useSourcePickerFlow ? (
        <PlanQuickActionMenu
          pinId={quickMenu.pinId}
          clientPinId={quickMenu.clientPinId}
          isSavedPin={quickMenu.isSavedPin}
          planSheetId={activePage?.sheetId ?? ""}
          xPct={quickMenu.xPct}
          yPct={quickMenu.yPct}
          captureDisabledReason={activePage && !activePage.sheetId ? "Sheet is still syncing." : undefined}
          onClose={() => setQuickMenu(null)}
          onCaptureRequest={onCaptureRequest}
        />
      ) : null}
    </div>
  );
}

export type { PlanPinDropPayload };
