"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { ImageOverlay, MapContainer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { capturePlanFitPadding } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { fitPlanLeafletMap } from "@/lib/site-walk/plan-leaflet-fit";
import type { LayerFilter } from "./plan-layer-types";
import type { PlanViewerPin } from "./PlanPin";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { PlanToolbar } from "./PlanToolbar";
import { PlanViewerLeafletEvents } from "./PlanViewerLeafletEvents";
import type { PlanPage, QuickMenuState } from "./planViewerModel";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
  hideToolbar?: boolean;
  pageIndex?: number;
  onPageIndexChange?: (index: number) => void;
  sheetImageUrls?: Record<string, string>;
  fitPadding?: ReturnType<typeof capturePlanFitPadding>;
  allowPinPlacement?: boolean;
};

function pinToLatLng(pin: { x_pct: number; y_pct: number }, width: number, height: number): L.LatLngExpression {
  return [(pin.y_pct / 100) * height, (pin.x_pct / 100) * width];
}

function createPinIcon(label: string, amber: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:28px;height:28px;border-radius:50%;background:${amber ? "#f59e0b" : "#64748b"};color:${amber ? "#0c0a09" : "#fff"};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ${amber ? "#fbbf24" : "#94a3b8"};box-shadow:0 2px 8px rgba(0,0,0,0.3)">${label}</div><div style="width:2px;height:8px;background:${amber ? "#f59e0b" : "#64748b"};border-radius:1px"></div></div>`,
  });
}

export function PlanViewerLeaflet({
  projectId,
  sessionId = "current-session",
  planSets = [],
  sheets = [],
  items = [],
  onCaptureRequest,
  onSelectItem,
  hideToolbar = false,
  pageIndex: controlledPageIndex,
  onPageIndexChange,
  sheetImageUrls,
  fitPadding,
  allowPinPlacement = true,
}: Props) {
  const [internalPageIndex, setInternalPageIndex] = useState(0);
  const [pins, setPins] = useState<PlanViewerPin[]>([]);
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
  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [[0, 0], [imageHeight, imageWidth]],
    [imageHeight, imageWidth],
  );

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

  useEffect(() => {
    if (!activePage?.sheetId) {
      setPins([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/site-walk/pins?plan_sheet_id=${encodeURIComponent(activePage.sheetId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ pins?: Array<{ id: string; client_pin_id: string | null; plan_sheet_id: string; x_pct: number; y_pct: number; pin_number: number | null; label: string | null; session_id: string; item_id: string | null }> }>) : null))
      .then((data) => {
        if (cancelled || !data?.pins) return;
        setPins(
          data.pins.map((p, i) => ({
            id: p.id,
            client_pin_id: p.client_pin_id,
            x_pct: p.x_pct,
            y_pct: p.y_pct,
            session_id: p.session_id,
            label: p.pin_number ? String(p.pin_number).padStart(2, "0") : String(i + 1).padStart(2, "0"),
            amber: p.session_id === sessionId,
            item_id: p.item_id,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activePage?.sheetId, sessionId]);

  const visiblePins = pins.filter((pin) => {
    if (filter === "none") return false;
    if (filter === "current") return pin.session_id === sessionId;
    return true;
  });

  const handleMapCreated = useCallback(
    (map: L.Map) => {
      mapRef.current = map;
      if (hasRasterized) fitPlanLeafletMap(map, activeSheet, imageWidth, imageHeight, padding);
    },
    [activeSheet, hasRasterized, imageHeight, imageWidth, padding],
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
          className="h-full w-full"
          style={{ background: "#000" }}
          ref={handleMapCreated}
        >
          <ImageOverlay url={imageUrl} bounds={bounds} />
          {allowPinPlacement ? (
            <PlanViewerLeafletEvents toolMode="pan" imageWidth={imageWidth} imageHeight={imageHeight} sessionId={sessionId} pins={pins} setPins={setPins} setQuickMenu={setQuickMenu} />
          ) : null}
          {visiblePins.map((pin) => (
            <Marker key={pin.id} position={pinToLatLng(pin, imageWidth, imageHeight)} icon={createPinIcon(pin.label, pin.amber)} />
          ))}
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

      {quickMenu ? (
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
