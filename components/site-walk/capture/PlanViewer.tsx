"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Hand, MapPin, Move } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { SiteWalkPin, SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { LayerFilter } from "./plan-layer-types";
import { mapPlanPin, mergeFetchedPlanPins, PlanPin, type PlanViewerPin } from "./PlanPin";
import { PlanPdfPage, type PlanPdfRenderDetails } from "./PlanPdfPage";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { PlanToolbar } from "./PlanToolbar";
import { PinInfoBubble, PlanEmptySurface } from "./PlanViewerParts";
import { buildPages, buildPlanPin, clamp, MAX_PLAN_SCALE, MIN_PLAN_SCALE, PLAN_BOTTOM_RESERVE, PLAN_FIT_PADDING, PLAN_PDF_BASE_HEIGHT, PLAN_PDF_BASE_WIDTH, PLAN_TOOLBAR_RESERVE, type Point, type QuickMenuState, type Transform } from "./planViewerModel";
import { usePlanGestures } from "./usePlanGestures";
import { calculateCenteredPlanTransform } from "./planViewerGeometry";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
};

type PdfReadyToken = PlanPdfRenderDetails & { sequence: number };

export function PlanViewer({ projectId, sessionId = "current-session", planSets = [], sheets = [], items = [], onCaptureRequest, onSelectItem }: Props) {
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
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const [hintVisible, setHintVisible] = useState(true);
  const [toolMode, setToolMode] = useState<"pan" | "draw">("pan");
  const pdfReadySequence = useRef(0);

  /** Apply transform directly to the DOM for zero-React-render gesture frames. */
  function applyTransformToDOM(t: Transform) {
    transformRef.current = t;
    if (surfaceRef.current) {
      surfaceRef.current.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`;
    }
  }

  /** Commit the ref-based transform to React state (for dependent UI like zoom %). */
  function commitTransform() {
    setTransform({ ...transformRef.current });
  }

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
    
    let frameId: number;
    let resizing = false;

    function fitPlanToViewport() { 
      resizing = false;
      const centered = calculateCenteredPlanTransform({ maxScale: 1, minScale: MIN_PLAN_SCALE, padding: PLAN_FIT_PADDING, reservedBottom: PLAN_BOTTOM_RESERVE, reservedTop: PLAN_TOOLBAR_RESERVE, surface: surface!, viewport: viewport! });
      applyTransformToDOM(centered);
      setTransform(centered);
    }
    
    // Initial setup inside RAF
    frameId = window.requestAnimationFrame(fitPlanToViewport);

    const observer = new ResizeObserver(() => {
      if (!resizing) {
        resizing = true;
        frameId = window.requestAnimationFrame(fitPlanToViewport);
      }
    });
    
    // Only observe viewport, observing surface can cause infinite loops when transform changes
    observer.observe(viewport); 
    return () => { 
      window.cancelAnimationFrame(frameId); 
      observer.disconnect(); 
    };
  }, [activePage, activePlanSet?.id, pdfReadyToken, planFileUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function handleNativeWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      const c = transformRef.current;
      const next = { ...c, scale: clamp(c.scale + (event.deltaY > 0 ? -0.1 : 0.1), MIN_PLAN_SCALE, MAX_PLAN_SCALE) };
      applyTransformToDOM(next);
      commitTransform();
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

  const handleLongPress = useCallback((point: Point) => {
    const nextPin = buildPlanPin(point, surfaceRef.current, pins.length + 1, sessionId);
    if (!nextPin) return;
    setPins((current) => [...current, nextPin]);
    setActivePinId(nextPin.id);
    setQuickMenu({ pinId: nextPin.id, xPct: nextPin.x_pct, yPct: nextPin.y_pct });
    if (navigator.vibrate) navigator.vibrate(50);
  }, [pins.length, sessionId]);

  const { startPress, movePointer, endPointer } = usePlanGestures({ surfaceRef, transformRef, applyTransformToDOM, commitTransform, toolMode, onLongPress: handleLongPress });

  function zoom(delta: number) {
    const c = transformRef.current;
    const next = { ...c, scale: clamp(c.scale + delta, MIN_PLAN_SCALE, MAX_PLAN_SCALE) };
    applyTransformToDOM(next);
    commitTransform();
  }

  function handlePinClick(event: MouseEvent, pinId: string) {
    event.stopPropagation();
    setActivePinId(pinId);
    const pin = pins.find((item) => item.id === pinId);
    if (!pin) return;
    if (pin.item_id) {
      setQuickMenu(null);
    } else {
      setQuickMenu({ pinId, xPct: pin.x_pct, yPct: pin.y_pct });
    }
  }

  return (
    <div className="absolute inset-0 touch-none select-none overflow-hidden bg-black text-white" style={{ WebkitTouchCallout: "none", touchAction: "none" }}>
      <div
        ref={viewportRef}
        className="absolute inset-0 z-0 touch-none select-none overflow-hidden" style={{ WebkitTouchCallout: "none", touchAction: "none" }}
        onPointerDown={startPress}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <div ref={surfaceRef} className="absolute left-0 top-0 touch-none select-none overflow-hidden bg-white" style={{ backfaceVisibility: "hidden", contain: "layout paint", height: PLAN_PDF_BASE_HEIGHT, touchAction: "none", transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`, transformOrigin: "top left", WebkitTouchCallout: "none", width: PLAN_PDF_BASE_WIDTH, willChange: "transform" }} data-plan-surface>
          {planFileUrl && activePage ? (
            <PlanPdfPage fileUrl={planFileUrl} pageNumber={activePage.pageNumber} label={activePage.label} onPageCount={setPdfPageCount} onPdfPageRendered={handlePdfPageRendered} />
          ) : (
            <PlanEmptySurface projectAware={Boolean(projectId)} />
          )}

          {/* Pin layer — pointer-events gated by toolMode */}
          <div className="absolute inset-0" style={{ pointerEvents: toolMode === "draw" ? "auto" : "none" }}>
          {visiblePins.map((pin) => {
            const isActive = activePinId === pin.id;
            const item = pin.item_id ? items.find((i) => i.id === pin.item_id) : null;
            return (
              <div key={pin.id}>
                <PlanPin pin={pin} active={isActive} current={pin.session_id === sessionId || pin.amber} onClick={(event) => handlePinClick(event, pin.id)} />
                {isActive && pin.item_id && <PinInfoBubble pin={pin} item={item} onSelect={() => onSelectItem?.(pin.item_id!)} />}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Pan / Draw toggle */}
      <div className="absolute left-1/2 top-2 z-50 flex -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/85 p-0.5 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={() => setToolMode("pan")} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${toolMode === "pan" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
          <Hand className="h-3.5 w-3.5" /> Pan
        </button>
        <button type="button" onClick={() => setToolMode("draw")} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${toolMode === "draw" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}>
          <MapPin className="h-3.5 w-3.5" /> Pin
        </button>
      </div>

      {/* Plan toolbar — anchored below the toggle */}
      <div className="absolute top-12 inset-x-2 z-50">
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
      </div>

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
        <button type="button" onClick={() => setHintVisible(false)} className="pointer-events-auto absolute bottom-[6.5rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 shadow-xl backdrop-blur hover:border-amber-300/40" aria-label="Dismiss hint">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300"><Move className="h-3 w-3 text-amber-500" /> {toolMode === "pan" ? "Pan & zoom. Tap Pin/Draw to place pins." : "Long-press to pin. Tap Pan to navigate."}</span>
        </button>
      )}
    </div>
  );
}


