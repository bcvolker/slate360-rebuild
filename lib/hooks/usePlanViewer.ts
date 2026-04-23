/**
 * lib/hooks/usePlanViewer.ts
 *
 * State container for the Site Walk plan viewer (PDF / image). Owns:
 *   - currentPage  — for multi-page PDFs (1-indexed)
 *   - zoomLevel    — fractional scale (1 = 100%)
 *   - panOffset    — { x, y } in CSS px relative to the viewer center
 *   - visibleLayers — Set of layer ids currently rendered
 *
 * Layering: pins/markups are filtered by `session_id` upstream. To show a
 * "Clean Set" the consumer simply omits the "pins" / "markup" layer ids
 * from `visibleLayers`. To show "Marked-Up" they include them.
 *
 * This hook is intentionally pure state — it does NOT fetch plans, render
 * canvases, or know about Konva/Fabric. Consumers wire it to whatever
 * canvas component they choose.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type PlanLayerId = "base" | "pins" | "markup" | "comments" | "measurements";

export interface PanOffset {
  x: number;
  y: number;
}

export interface PlanViewerState {
  currentPage: number;
  pageCount: number;
  zoomLevel: number;
  panOffset: PanOffset;
  visibleLayers: Set<PlanLayerId>;
  isCleanView: boolean;
}

export interface PlanViewerApi {
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageCount: (count: number) => void;
  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  resetZoom: () => void;
  setPan: (offset: PanOffset) => void;
  panBy: (delta: PanOffset) => void;
  resetPan: () => void;
  resetView: () => void;
  toggleLayer: (layer: PlanLayerId) => void;
  setLayerVisible: (layer: PlanLayerId, visible: boolean) => void;
  showCleanSet: () => void;
  showMarkedUp: () => void;
}

export interface UsePlanViewerOptions {
  initialPage?: number;
  initialZoom?: number;
  initialLayers?: PlanLayerId[];
  minZoom?: number;
  maxZoom?: number;
  pageCount?: number;
}

const MARKUP_LAYERS: PlanLayerId[] = ["pins", "markup", "comments", "measurements"];
const DEFAULT_LAYERS: PlanLayerId[] = ["base", "pins", "markup"];

export function usePlanViewer(opts: UsePlanViewerOptions = {}): PlanViewerState & PlanViewerApi {
  const minZoom = opts.minZoom ?? 0.25;
  const maxZoom = opts.maxZoom ?? 8;

  const [currentPage, setCurrentPageState] = useState<number>(opts.initialPage ?? 1);
  const [pageCount, setPageCountState] = useState<number>(opts.pageCount ?? 1);
  const [zoomLevel, setZoomLevelState] = useState<number>(opts.initialZoom ?? 1);
  const [panOffset, setPanOffsetState] = useState<PanOffset>({ x: 0, y: 0 });
  const [visibleLayers, setVisibleLayers] = useState<Set<PlanLayerId>>(
    () => new Set(opts.initialLayers ?? DEFAULT_LAYERS),
  );

  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;

  const clampZoom = useCallback(
    (z: number) => Math.min(maxZoom, Math.max(minZoom, z)),
    [minZoom, maxZoom],
  );

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(Math.min(Math.max(1, Math.floor(page)), Math.max(1, pageCountRef.current)));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPageState((p) => Math.min(p + 1, Math.max(1, pageCountRef.current)));
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPageState((p) => Math.max(p - 1, 1));
  }, []);

  const setPageCount = useCallback((count: number) => {
    const safe = Math.max(1, Math.floor(count));
    setPageCountState(safe);
    setCurrentPageState((p) => Math.min(p, safe));
  }, []);

  const setZoom = useCallback((zoom: number) => setZoomLevelState(clampZoom(zoom)), [clampZoom]);
  const zoomBy = useCallback(
    (delta: number) => setZoomLevelState((z) => clampZoom(z + delta)),
    [clampZoom],
  );
  const resetZoom = useCallback(() => setZoomLevelState(1), []);

  const setPan = useCallback((offset: PanOffset) => setPanOffsetState(offset), []);
  const panBy = useCallback(
    (delta: PanOffset) =>
      setPanOffsetState((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
    [],
  );
  const resetPan = useCallback(() => setPanOffsetState({ x: 0, y: 0 }), []);

  const resetView = useCallback(() => {
    setZoomLevelState(1);
    setPanOffsetState({ x: 0, y: 0 });
  }, []);

  const toggleLayer = useCallback((layer: PlanLayerId) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const setLayerVisible = useCallback((layer: PlanLayerId, visible: boolean) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (visible) next.add(layer);
      else next.delete(layer);
      return next;
    });
  }, []);

  const showCleanSet = useCallback(() => {
    setVisibleLayers(new Set<PlanLayerId>(["base"]));
  }, []);

  const showMarkedUp = useCallback(() => {
    setVisibleLayers(new Set<PlanLayerId>(["base", ...MARKUP_LAYERS]));
  }, []);

  const isCleanView = useMemo(
    () => MARKUP_LAYERS.every((l) => !visibleLayers.has(l)),
    [visibleLayers],
  );

  return {
    currentPage,
    pageCount,
    zoomLevel,
    panOffset,
    visibleLayers,
    isCleanView,
    setCurrentPage,
    nextPage,
    prevPage,
    setPageCount,
    setZoom,
    zoomBy,
    resetZoom,
    setPan,
    panBy,
    resetPan,
    resetView,
    toggleLayer,
    setLayerVisible,
    showCleanSet,
    showMarkedUp,
  };
}
