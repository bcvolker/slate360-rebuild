"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject, type WheelEvent } from "react";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

type Gesture =
  | { type: "pan"; startX: number; startY: number; panX: number; panY: number }
  | {
      type: "drag";
      id: string;
      origX: number;
      origY: number;
      origX2?: number;
      origY2?: number;
      /** Whole-polygon drag (S5.6): translate every vertex by the same delta. */
      origPoints?: { x: number; y: number }[];
    }
  | { type: "resize"; id: string }
  | { type: "line-end"; id: string; which: "start" | "end" };

export type ImageCoords = { imgX: number; imgY: number; inBounds: boolean };

/**
 * Pan/zoom + measurement-gesture engine for AnalyzeCanvas (extracted S5.5 to keep
 * the component under the file-size guard). Owns the transform, the letterbox-box
 * measurement, the client→image coordinate map, and the drag/resize/line-end/pan
 * gesture that mutates a live draft copy of the spots until mouseup commits it.
 */
export function useCanvasStage({
  grid,
  spots,
  canvasRef,
  onCommitSpots,
}: {
  grid: ThermalV2Grid | null;
  spots: ThermalV2Spot[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onCommitSpots: (next: ThermalV2Spot[]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasBox, setCanvasBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const gestureRef = useRef<Gesture | null>(null);
  const [draftSpots, setDraftSpots] = useState<ThermalV2Spot[] | null>(null);

  const visibleSpots = draftSpots ?? spots;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [grid?.width, grid?.height]);

  // Track the canvas's OWN rendered box (browser already aspect-fit it via CSS) so
  // the overlay div can be positioned to match the letterboxed picture exactly.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    function measure() {
      const canvasEl = canvasRef.current;
      const stageEl = stageRef.current;
      if (!canvasEl || !stageEl || !grid) return;
      const canvasRect = canvasEl.getBoundingClientRect();
      const stageRect = stageEl.getBoundingClientRect();
      const fitScale = canvasRect.width > 0 ? Math.min(canvasRect.width / grid.width, canvasRect.height / grid.height) : 0;
      const fitW = grid.width * fitScale;
      const fitH = grid.height * fitScale;
      setCanvasBox({
        left: (canvasRect.left - stageRect.left + (canvasRect.width - fitW) / 2) / zoom,
        top: (canvasRect.top - stageRect.top + (canvasRect.height - fitH) / 2) / zoom,
        width: fitW / zoom,
        height: fitH / zoom,
      });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, zoom]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number): ImageCoords | null => {
      const stage = stageRef.current;
      if (!stage || !grid || canvasBox.width === 0) return null;
      const stageRect = stage.getBoundingClientRect();
      const localX = (clientX - stageRect.left) / zoom - canvasBox.left;
      const localY = (clientY - stageRect.top) / zoom - canvasBox.top;
      const imgX = (localX / canvasBox.width) * grid.width;
      const imgY = (localY / canvasBox.height) * grid.height;
      return { imgX, imgY, inBounds: imgX >= 0 && imgY >= 0 && imgX <= grid.width && imgY <= grid.height };
    },
    [grid, canvasBox, zoom],
  );

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function startPan(e: MouseEvent) {
    gestureRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function startSpotDrag(id: string) {
    const spot = spots.find((s) => s.id === id);
    if (!spot) return;
    gestureRef.current = {
      type: "drag",
      id,
      origX: spot.x,
      origY: spot.y,
      origX2: spot.x2,
      origY2: spot.y2,
      origPoints: spot.kind === "polygon" ? spot.points : undefined,
    };
    setDraftSpots(spots);
  }

  function startResize(id: string) {
    gestureRef.current = { type: "resize", id };
    setDraftSpots(spots);
  }

  function startLineEnd(id: string, which: "start" | "end") {
    gestureRef.current = { type: "line-end", id, which };
    setDraftSpots(spots);
  }

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const g = gestureRef.current;
      if (!g || !grid) return;
      if (g.type === "pan") {
        setPan({ x: g.panX + (e.clientX - g.startX), y: g.panY + (e.clientY - g.startY) });
        return;
      }
      const coords = toImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      setDraftSpots((prev) => {
        const base = prev ?? spots;
        return base.map((s) => {
          if (s.id !== g.id) return s;
          if (g.type === "drag") {
            const dx = coords.imgX - g.origX;
            const dy = coords.imgY - g.origY;
            if (s.kind === "polygon" && g.origPoints) {
              return { ...s, x: g.origX + dx, y: g.origY + dy, points: g.origPoints.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
            }
            if (s.kind === "line" && s.x2 != null && s.y2 != null) {
              return { ...s, x: g.origX + dx, y: g.origY + dy, x2: (g.origX2 ?? s.x2) + dx, y2: (g.origY2 ?? s.y2) + dy };
            }
            return { ...s, x: coords.imgX, y: coords.imgY };
          }
          if (g.type === "resize") {
            const w = Math.max(4, Math.abs(coords.imgX - s.x) * 2);
            const h = Math.max(4, Math.abs(coords.imgY - s.y) * 2);
            return { ...s, w, h };
          }
          if (g.type === "line-end") {
            return g.which === "start" ? { ...s, x: coords.imgX, y: coords.imgY } : { ...s, x2: coords.imgX, y2: coords.imgY };
          }
          return s;
        });
      });
    }
    function onUp() {
      const g = gestureRef.current;
      gestureRef.current = null;
      setDraftSpots((draft) => {
        if (g && g.type !== "pan" && draft) onCommitSpots(draft);
        return null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, spots, toImageCoords, onCommitSpots]);

  const gestureActive = () => gestureRef.current !== null;

  return {
    stageRef,
    zoom,
    pan,
    canvasBox,
    visibleSpots,
    toImageCoords,
    handleWheel,
    startPan,
    startSpotDrag,
    startResize,
    startLineEnd,
    gestureActive,
  };
}
