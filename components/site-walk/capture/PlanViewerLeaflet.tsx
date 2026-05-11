"use client";

/**
 * PlanViewerLeaflet — mobile-first plan viewer using Leaflet.js.
 *
 * Replaces react-pdf for mobile. Displays server-rasterized WebP images of
 * plan pages using Leaflet's CRS.Simple (pixel coordinates, not lat/lng).
 *
 * Why Leaflet:
 * - Uses <img> tags, not <canvas> — no WebKit canvas memory budget issues
 * - Native pinch/zoom/pan on all mobile browsers
 * - 42KB gzipped — tiny bundle
 * - CRS.Simple is designed for image overlays (floor plans, blueprints)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hand, Loader2, MapPin } from "lucide-react";
import L from "leaflet";
import { ImageOverlay, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { LayerFilter } from "./plan-layer-types";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { PlanToolbar } from "./PlanToolbar";
import { buildPages, type QuickMenuState } from "./planViewerModel";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
};

type PlanViewerPin = {
  id: string;
  x_pct: number;
  y_pct: number;
  session_id: string;
  label: string;
  amber: boolean;
  item_id: string | null;
};

/** Convert percentage-based pin to Leaflet CRS.Simple coordinates. */
function pinToLatLng(pin: { x_pct: number; y_pct: number }, width: number, height: number): L.LatLngExpression {
  return [
    (pin.y_pct / 100) * height,
    (pin.x_pct / 100) * width,
  ];
}

/** Create an amber or grey numbered pin icon. */
function createPinIcon(label: string, amber: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:28px;height:28px;border-radius:50%;background:${amber ? "#f59e0b" : "#64748b"};color:${amber ? "#0c0a09" : "#fff"};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ${amber ? "#fbbf24" : "#94a3b8"};box-shadow:0 2px 8px rgba(0,0,0,0.3)">${label}</div><div style="width:2px;height:8px;background:${amber ? "#f59e0b" : "#64748b"};border-radius:1px"></div></div>`,
  });
}

export function PlanViewerLeaflet({ projectId, sessionId = "current-session", planSets = [], sheets = [], items = [], onCaptureRequest, onSelectItem }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pdfPageCount] = useState(0);
  const [pins, setPins] = useState<PlanViewerPin[]>([]);
  const [filter, setFilter] = useState<LayerFilter>("all");
  const [quickMenu, setQuickMenu] = useState<QuickMenuState>(null);
  const [toolMode, setToolMode] = useState<"pan" | "draw">("pan");
  const mapRef = useRef<L.Map | null>(null);

  const activePlanSet = useMemo(() => planSets.find((ps) => ps.processing_status === "ready") ?? planSets[0] ?? null, [planSets]);
  const planSheets = useMemo(() => activePlanSet ? sheets.filter((s) => s.plan_set_id === activePlanSet.id) : [], [activePlanSet, sheets]);
  const pages = useMemo(() => buildPages(activePlanSet, planSheets, pdfPageCount), [activePlanSet, planSheets, pdfPageCount]);
  const safePageIndex = pages.length > 0 ? Math.min(pageIndex, pages.length - 1) : 0;
  const activePage = pages[safePageIndex] ?? null;

  // Find the rasterized sheet for the active page
  const activeSheet = planSheets.find((s) => s.id === activePage?.sheetId) ?? null;
  const hasRasterized = Boolean(activeSheet?.rasterized_key && activeSheet.rasterized_width && activeSheet.rasterized_height);
  const imageWidth = activeSheet?.rasterized_width ?? 2048;
  const imageHeight = activeSheet?.rasterized_height ?? 1448;
  const imageUrl = activeSheet?.rasterized_key ? `/api/site-walk/plan-sheets/${activeSheet.id}/image` : null;

  // Leaflet bounds for CRS.Simple: [[0,0], [height, width]]
  const bounds = useMemo<L.LatLngBoundsExpression>(() => [[0, 0], [imageHeight, imageWidth]], [imageHeight, imageWidth]);

  // Fetch pins for the active sheet
  useEffect(() => {
    if (!activePage?.sheetId) { setPins([]); return; }
    let cancelled = false;
    fetch(`/api/site-walk/pins?plan_sheet_id=${encodeURIComponent(activePage.sheetId)}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() as Promise<{ pins?: Array<{ id: string; plan_sheet_id: string; x_pct: number; y_pct: number; label: string; session_id: string; item_id: string | null }> }> : null)
      .then((data) => {
        if (cancelled || !data?.pins) return;
        setPins(data.pins.map((p, i) => ({ id: p.id, x_pct: p.x_pct, y_pct: p.y_pct, session_id: p.session_id, label: p.label || String(i + 1).padStart(2, "0"), amber: p.session_id === sessionId, item_id: p.item_id })));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activePage?.sheetId, sessionId]);

  const visiblePins = pins.filter((pin) => {
    if (filter === "none") return false;
    if (filter === "current") return pin.session_id === sessionId;
    return true;
  });

  const captureDisabledReason = activePage && !activePage.sheetId ? "Sheet is still syncing." : undefined;

  function handlePinClick(pinId: string) {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    if (pin.item_id) {
      onSelectItem?.(pin.item_id);
    } else {
      setQuickMenu({ pinId, xPct: pin.x_pct, yPct: pin.y_pct });
    }
  }

  const handleMapCreated = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  return (
    <div className="absolute inset-0 touch-none select-none overflow-hidden bg-black text-white" style={{ WebkitTouchCallout: "none" }}>
      {/* Leaflet map container */}
      {hasRasterized && imageUrl ? (
        <MapContainer
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
          <MapEventHandler toolMode={toolMode} imageWidth={imageWidth} imageHeight={imageHeight} sessionId={sessionId} pins={pins} setPins={setPins} setQuickMenu={setQuickMenu} />
          {visiblePins.map((pin) => (
            <Marker
              key={pin.id}
              position={pinToLatLng(pin, imageWidth, imageHeight)}
              icon={createPinIcon(pin.label, pin.amber)}
              eventHandlers={{ click: () => handlePinClick(pin.id) }}
            />
          ))}
        </MapContainer>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-black text-white">Loading plan…</p>
          <p className="text-xs font-semibold text-slate-400">
            {!activePlanSet ? "No plan sets found for this project." : !hasRasterized ? "Plan is being processed. The image will appear shortly." : "Loading image…"}
          </p>
        </div>
      )}

      {/* Pan / Draw toggle */}
      <div className="absolute left-1/2 top-2 z-[1000] flex -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/85 p-0.5 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={() => setToolMode("pan")} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${toolMode === "pan" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
          <Hand className="h-3.5 w-3.5" /> Pan
        </button>
        <button type="button" onClick={() => setToolMode("draw")} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${toolMode === "draw" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
          <MapPin className="h-3.5 w-3.5" /> Pin
        </button>
      </div>

      {/* Plan toolbar */}
      <div className="absolute top-12 inset-x-2 z-[1000]">
        <PlanToolbar
          fileUrl={null}
          pages={pages.map((p) => ({ key: p.key, label: p.label, pageNumber: p.pageNumber }))}
          activeIndex={safePageIndex}
          zoomPercent={mapRef.current ? Math.round(Math.pow(2, mapRef.current.getZoom()) * 100) : 100}
          filter={filter}
          pinCount={visiblePins.length}
          onSelect={setPageIndex}
          onZoom={(delta) => { if (mapRef.current) delta > 0 ? mapRef.current.zoomIn(0.5) : mapRef.current.zoomOut(0.5); }}
          onChangeFilter={setFilter}
        />
      </div>

      {/* Quick action menu for pin */}
      {quickMenu && (
        <PlanQuickActionMenu
          pinId={quickMenu.pinId}
          planSheetId={activePage?.sheetId ?? ""}
          xPct={quickMenu.xPct}
          yPct={quickMenu.yPct}
          captureDisabledReason={captureDisabledReason}
          onClose={() => setQuickMenu(null)}
          onCaptureRequest={onCaptureRequest}
        />
      )}
    </div>
  );
}

/** Handles map click events for pin creation in draw mode. */
function MapEventHandler({ toolMode, imageWidth, imageHeight, sessionId, pins, setPins, setQuickMenu }: {
  toolMode: "pan" | "draw";
  imageWidth: number;
  imageHeight: number;
  sessionId: string;
  pins: PlanViewerPin[];
  setPins: React.Dispatch<React.SetStateAction<PlanViewerPin[]>>;
  setQuickMenu: React.Dispatch<React.SetStateAction<QuickMenuState>>;
}) {
  const map = useMap();

  // Disable/enable map dragging based on tool mode
  useEffect(() => {
    if (toolMode === "draw") {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [toolMode, map]);

  useMapEvents({
    click(e) {
      if (toolMode !== "draw") return;
      const yPct = (e.latlng.lat / imageHeight) * 100;
      const xPct = (e.latlng.lng / imageWidth) * 100;
      if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
      const newPin: PlanViewerPin = {
        id: Math.random().toString(36).slice(2),
        x_pct: xPct,
        y_pct: yPct,
        session_id: sessionId,
        label: String(pins.length + 1).padStart(2, "0"),
        amber: true,
        item_id: null,
      };
      setPins((current) => [...current, newPin]);
      setQuickMenu({ pinId: newPin.id, xPct, yPct });
      if (navigator.vibrate) navigator.vibrate(50);
    },
  });

  return null;
}
