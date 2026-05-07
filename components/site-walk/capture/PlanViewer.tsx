"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type MutableRefObject, type PointerEvent } from "react";
import { Move } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { SiteWalkPin, SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { LayerFilter } from "./plan-layer-types";
import { mapPlanPin, mergeFetchedPlanPins, PlanPin, type PlanViewerPin } from "./PlanPin";
import { PlanPdfPage, type PlanPdfRenderDetails } from "./PlanPdfPage";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { PlanToolbar } from "./PlanToolbar";
import { calculateCenteredPlanTransform } from "./planViewerGeometry";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
};

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };
type QuickMenuState = { pinId?: string; xPct: number; yPct: number } | null;
type PlanPage = { key: string; label: string; pageNumber: number; sheetId?: string };
type PdfReadyToken = PlanPdfRenderDetails & { sequence: number };
const MIN_SCALE = 0.35, MAX_SCALE = 2.5, FIT_PADDING = 32;

export function PlanViewer({ projectId, sessionId = "current-session", planSets = [], sheets = [], onCaptureRequest }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<PlanViewerPin[]>([]);
  const [filter, setFilter] = useState<LayerFilter>("all");
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfReadyToken, setPdfReadyToken] = useState<PdfReadyToken | null>(null);
  const [quickMenu, setQuickMenu] = useState<QuickMenuState>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [hintVisible, setHintVisible] = useState(true);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ pointerId: number; point: Point; offset: Point; moved: boolean } | null>(null);
  const activePointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const pdfReadySequence = useRef(0);

  const activePlanSet = useMemo(() => planSets.find((planSet) => planSet.processing_status === "ready") ?? planSets[0] ?? null, [planSets]);
  const planSheets = useMemo(() => activePlanSet ? sheets.filter((sheet) => sheet.plan_set_id === activePlanSet.id) : [], [activePlanSet, sheets]);
  const pages = useMemo(() => buildPages(activePlanSet, planSheets, pdfPageCount), [activePlanSet, planSheets, pdfPageCount]);
  const safePageIndex = pages.length > 0 ? Math.min(pageIndex, pages.length - 1) : 0;
  const activePage = pages[safePageIndex] ?? null;
  const planFileUrl = activePlanSet?.source_s3_key ? `/api/site-walk/plan-sets/${activePlanSet.id}/file` : null;
  const captureDisabledReason = activePage && !activePage.sheetId ? "Plan sheet is still syncing. Uploads unlock when this PDF page has a saved sheet ID." : undefined;

  const handlePdfPageRendered = useCallback((details: PlanPdfRenderDetails) => {
    pdfReadySequence.current += 1;
    setPdfReadyToken({ ...details, sequence: pdfReadySequence.current });
  }, []);

  useEffect(() => setPdfReadyToken(null), [activePage?.pageNumber, planFileUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const surface = surfaceRef.current;
    if (!viewport || !surface) return;
    if (planFileUrl && activePage && (!pdfReadyToken || pdfReadyToken.fileUrl !== planFileUrl || pdfReadyToken.pageNumber !== activePage.pageNumber)) return;
    function fitPlanToViewport() { setTransform(calculateCenteredPlanTransform({ maxScale: 1, minScale: MIN_SCALE, padding: FIT_PADDING, surface: surface!, viewport: viewport! })); }
    const frameId = window.requestAnimationFrame(fitPlanToViewport);
    const observer = new ResizeObserver(fitPlanToViewport);
    observer.observe(viewport); observer.observe(surface);
    return () => { window.cancelAnimationFrame(frameId); observer.disconnect(); };
  }, [activePage, activePlanSet?.id, pdfReadyToken, planFileUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function handleNativeWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      setTransform((current) => ({ ...current, scale: clamp(current.scale + (event.deltaY > 0 ? -0.1 : 0.1), MIN_SCALE, MAX_SCALE) }));
    }
    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleNativeWheel);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activePage?.sheetId) {
      setPins([]);
      return;
    }
    fetch(`/api/site-walk/pins?plan_sheet_id=${encodeURIComponent(activePage.sheetId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ pins?: SiteWalkPin[] }> : null)
      .then((data) => {
        if (cancelled || !data) return;
        const fetched = (data.pins ?? []).map((pin, index) => mapPlanPin(pin, index, sessionId));
        setPins((current) => mergeFetchedPlanPins(current, fetched));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activePage?.sheetId, sessionId]);

  const visiblePins = pins.filter((pin) => {
    if (filter === "none") return false;
    if (filter === "current") return pin.session_id === sessionId;
    return true;
  });

  const startPress = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    activePointers.current.set(event.pointerId, point);
    dragStart.current = { pointerId: event.pointerId, point, offset: { x: transform.x, y: transform.y }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointers.current.size >= 2) {
      clearPressTimer(pressTimer);
      dragStart.current = null;
      pinchStart.current = { distance: pointerDistance(activePointers.current), scale: transform.scale };
      return;
    }

    pressTimer.current = setTimeout(() => {
      const drag = dragStart.current;
      if (!drag || drag.moved) return;
      const nextPin = buildPin(point, surfaceRef.current, pins.length + 1, sessionId);
      if (!nextPin) return;
      setPins((current) => [...current, nextPin]);
      setActivePinId(nextPin.id);
      setQuickMenu({ pinId: nextPin.id, xPct: nextPin.x_pct, yPct: nextPin.y_pct });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [pins.length, sessionId, transform.scale, transform.x, transform.y]);

  const movePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.current.size >= 2 && pinchStart.current) {
      clearPressTimer(pressTimer);
      const ratio = pointerDistance(activePointers.current) / Math.max(1, pinchStart.current.distance);
      setTransform((current) => ({ ...current, scale: clamp(pinchStart.current!.scale * ratio, MIN_SCALE, MAX_SCALE) }));
      return;
    }

    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.point.x;
    const dy = event.clientY - drag.point.y;
    if (Math.hypot(dx, dy) > 5) {
      drag.moved = true;
      clearPressTimer(pressTimer);
    }
    if (drag.moved) setTransform((current) => ({ ...current, x: drag.offset.x + dx, y: drag.offset.y + dy }));
  }, []);

  const endPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    clearPressTimer(pressTimer);
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  }, []);

  function zoom(delta: number) {
    setTransform((current) => ({ ...current, scale: clamp(current.scale + delta, MIN_SCALE, MAX_SCALE) }));
  }

  function handlePinClick(event: MouseEvent, pinId: string) {
    event.stopPropagation();
    setActivePinId(pinId);
    const pin = pins.find((item) => item.id === pinId);
    if (pin) setQuickMenu({ pinId, xPct: pin.x_pct, yPct: pin.y_pct });
  }

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-slate-950 text-white" style={{ WebkitTouchCallout: "none" }}>
      <div
        ref={viewportRef}
        className="absolute inset-0 z-0 touch-none select-none overflow-hidden bg-slate-950" style={{ WebkitTouchCallout: "none" }}
        onPointerDown={startPress}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <div ref={surfaceRef} className="absolute left-0 top-0 aspect-[1.4/1] w-[150vw] max-w-6xl touch-none select-none overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "top left", WebkitTouchCallout: "none" }}>
          {planFileUrl && activePage ? (
            <PlanPdfPage fileUrl={planFileUrl} pageNumber={activePage.pageNumber} label={activePage.label} onPageCount={setPdfPageCount} onPdfPageRendered={handlePdfPageRendered} />
          ) : (
            <PlanEmptySurface projectAware={Boolean(projectId)} />
          )}

          {visiblePins.map((pin) => <PlanPin key={pin.id} pin={pin} active={activePinId === pin.id} current={pin.session_id === sessionId || pin.amber} onClick={(event) => handlePinClick(event, pin.id)} />)}
        </div>
      </div>

      {/* Unified plan toolbar (search, page input, thumbnails, layers, zoom, collapse) */}
      <PlanToolbar
        fileUrl={planFileUrl}
        pages={pages.map((page) => ({ key: page.key, label: page.label, pageNumber: page.pageNumber }))}
        activeIndex={safePageIndex}
        zoomPercent={Math.round(transform.scale * 100)}
        filter={filter}
        pinCount={visiblePins.length}
        onSelect={(index) => { setPageIndex(index); setHintVisible(false); }}
        onZoom={zoom}
        onChangeFilter={setFilter}
      />

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

      {hintVisible && (
        <button type="button" onClick={() => setHintVisible(false)} className="pointer-events-auto absolute bottom-[6.5rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 shadow-xl backdrop-blur hover:border-amber-300/40" aria-label="Dismiss long-press hint">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300"><Move className="h-3 w-3 text-amber-500" /> Pan, zoom, or long-press to drop pin</span>
        </button>
      )}
    </div>
  );
}

function PlanEmptySurface({ projectAware }: { projectAware: boolean }) {
  return <div className="flex h-full w-full items-center justify-center bg-white px-8 text-center text-sm font-bold text-slate-600">{projectAware ? "The uploaded plan file is still being prepared. Use the toolbar to switch pages or refresh." : "Start this walk from a field project with uploaded plans to use plan mode."}</div>;
}

function buildPages(planSet: SiteWalkPlanSet | null, sheets: SiteWalkPlanSheet[], pdfPageCount: number): PlanPage[] {
  if (!planSet) return [];
  const total = Math.max(planSet.page_count || 0, sheets.length, pdfPageCount, 1);
  return Array.from({ length: total }, (_, index) => {
    const pageNumber = index + 1;
    const sheet = sheets.find((item) => item.sheet_number === pageNumber);
    return { key: sheet?.id ?? `${planSet.id}-${pageNumber}`, label: sheet?.sheet_name ?? `Sheet ${pageNumber}`, pageNumber, sheetId: sheet?.id };
  });
}

function buildPin(point: Point, surface: HTMLDivElement | null, count: number, sessionId: string): PlanViewerPin | null {
  if (!surface) return null;
  const rect = surface.getBoundingClientRect();
  const xPct = clamp(((point.x - rect.left) / rect.width) * 100, 0, 100);
  const yPct = clamp(((point.y - rect.top) / rect.height) * 100, 0, 100);
  return { id: Math.random().toString(36).slice(2), x_pct: xPct, y_pct: yPct, session_id: sessionId, label: String(count).padStart(2, "0"), amber: true };
}

function clearPressTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

function pointerDistance(points: Map<number, Point>) {
  const [first, second] = Array.from(points.values());
  if (!first || !second) return 1;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}