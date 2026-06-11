import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import { VECTOR_TOOL_EVENT, type VectorTool } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import { buildShape, buildText, findShapeAtPoint, MARKUP_HEIGHT, MARKUP_WIDTH, moveShape, type DraftPoint, type PointerPoint, type Transform } from "@/components/site-walk/capture/markupCanvasGeometry";
import { resizeShapeFromHandle, type ResizeHandle } from "@/components/site-walk/capture/markupShapeEdits";
import { applyWheelZoom, beginPinch, computePanTransform, computePinchTransform, reanchorPan, type PanAnchor, type PinchAnchor } from "@/components/site-walk/capture/markupPanTransform";
import { readCaptureMarkupColor } from "./capture-canvas-markup-colors";
import { createMarkupMutations } from "./capture-v2-markup-mutations";
import { applyDoubleTapZoom, createDoubleTapTracker, isDoubleTap } from "./capture-v2-double-tap";
import { clientToImagePct } from "./capture-v2-photo-coords";

type DragState = { id: string; start: DraftPoint; shape: MarkupShape; mode: "move" } | { id: string; handle: ResizeHandle; mode: "resize" };
type PendingMove = { pointerId: number; clientX: number; clientY: number; previous?: PointerPoint };

type Args = {
  imageUrl: string;
  markupEnabled: boolean;
  initialMarkup?: MarkupData | null;
  onMarkupChange?: (markup: MarkupData) => void;
  pinMode?: boolean;
  onPlacePin?: (xPct: number, yPct: number) => void;
  onAttachHere?: (xPct: number, yPct: number) => void;
};

export function useCaptureV2PhotoCanvasState({
  imageUrl,
  markupEnabled,
  initialMarkup,
  onMarkupChange,
  pinMode = false,
  onPlacePin,
  onAttachHere,
}: Args) {
  const stageRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const pinchRef = useRef<PinchAnchor | null>(null);
  const panRef = useRef<PanAnchor | null>(null);
  const doubleTapRef = useRef(createDoubleTapTracker());
  const undoRef = useRef<MarkupShape[][]>([]);
  const redoRef = useRef<MarkupShape[][]>([]);
  const shapesRef = useRef<MarkupShape[]>(initialMarkup?.shapes ?? []);
  const selectedIdRef = useRef<string | null>(null);
  const draftStartRef = useRef<DraftPoint | null>(null);
  const draftPointsRef = useRef<number[]>([]);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<VectorTool>("select");
  const [color, setColor] = useState(readCaptureMarkupColor);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [shapes, setShapes] = useState<MarkupShape[]>(initialMarkup?.shapes ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState<DraftPoint | null>(null);
  const [draftPoints, setDraftPoints] = useState<number[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const { applyShapes, emitMarkup, remember, updateText, applyToolDetail } = useMemo(
    () =>
      createMarkupMutations(
        { shapesRef, undoRef, redoRef, selectedIdRef },
        { setShapes, setSelectedId, setEditingTextId },
        onMarkupChange,
      ),
    [onMarkupChange],
  );

  useEffect(() => {
    function handleTool(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const nextTool = typeof detail?.tool === "string" ? detail.tool : "draw";
      if (["select", "draw", "box", "circle", "arrow", "text"].includes(nextTool)) setTool(nextTool as VectorTool);
      applyToolDetail(detail, setColor, setStrokeWidth);
    }
    window.addEventListener(VECTOR_TOOL_EVENT, handleTool);
    return () => window.removeEventListener(VECTOR_TOOL_EVENT, handleTool);
  }, [applyToolDetail]);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // The toolbar publishes its initial "draw" VECTOR_TOOL_EVENT on mount, which
  // can fire before this hook's listener attaches — leaving the tool stuck on
  // "select" so drags pan the photo instead of drawing. Sync directly.
  useEffect(() => {
    if (markupEnabled) setTool("draw");
  }, [markupEnabled]);

  // The toolbar's undo/redo buttons dispatch the shared markup history events;
  // only the legacy V1 canvas listened for them. Wire them here too.
  useEffect(() => {
    function undo() {
      const previous = undoRef.current.pop();
      if (!previous) return;
      redoRef.current = [shapesRef.current, ...redoRef.current.slice(0, 14)];
      shapesRef.current = previous;
      setShapes(previous);
      setSelectedId(null);
      emitMarkup(previous);
    }
    function redo() {
      const next = redoRef.current.shift();
      if (!next) return;
      undoRef.current = [...undoRef.current.slice(-14), shapesRef.current];
      shapesRef.current = next;
      setShapes(next);
      setSelectedId(null);
      emitMarkup(next);
    }
    window.addEventListener("site-walk-photo-markup-undo", undo);
    window.addEventListener("site-walk-photo-markup-redo", redo);
    return () => {
      window.removeEventListener("site-walk-photo-markup-undo", undo);
      window.removeEventListener("site-walk-photo-markup-redo", redo);
    };
  }, [emitMarkup]);
  useEffect(() => {
    const nextShapes = initialMarkup?.shapes ?? [];
    shapesRef.current = nextShapes;
    setShapes(nextShapes);
    setSelectedId(null);
    setEditingTextId(null);
    updateTransform({ x: 0, y: 0, scale: 1 });
  }, [imageUrl]);
  useEffect(() => () => { if (rafRef.current) window.cancelAnimationFrame(rafRef.current); }, []);

  function updateTransform(next: Transform | ((current: Transform) => Transform)) {
    const resolved = typeof next === "function" ? next(transformRef.current) : next;
    transformRef.current = resolved;
    setTransform(resolved);
  }
  function clearLongPress() { if (longPressRef.current) window.clearTimeout(longPressRef.current); longPressRef.current = null; }

  function toPoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const currentTransform = transformRef.current;
    return {
      x: (((clientX - rect.left - currentTransform.x) / currentTransform.scale) / rect.width) * MARKUP_WIDTH,
      y: (((clientY - rect.top - currentTransform.y) / currentTransform.scale) / rect.height) * MARKUP_HEIGHT,
    };
  }

  function imagePctFromClient(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return clientToImagePct(clientX, clientY, rect, transformRef.current);
  }

  function scheduleLongPress(clientX: number, clientY: number) {
    const canPlacePin = !markupEnabled && Boolean(onPlacePin);
    const canAttach = !markupEnabled && !canPlacePin && Boolean(onAttachHere);
    if (!canPlacePin && !canAttach) return;
    longPressRef.current = window.setTimeout(() => {
      const point = imagePctFromClient(clientX, clientY);
      if (!point) return;
      if (canPlacePin) onPlacePin?.(point.xPct, point.yPct);
      else onAttachHere?.(point.xPct, point.yPct);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    }, 550);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pendingMoveRef.current = null;
    clearLongPress();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      pinchRef.current = beginPinch(pointersRef.current, transformRef.current.scale, transformRef.current);
      return;
    }
    panRef.current = { x: event.clientX, y: event.clientY, origin: transformRef.current };
    scheduleLongPress(event.clientX, event.clientY);
    if (!markupEnabled) return;
    const point = toPoint(event.clientX, event.clientY);
    if (tool === "select") {
      const hit = findShapeAtPoint(shapesRef.current, point);
      if (!hit) { setSelectedId(null); return; }
      if (hit.kind === "text" && selectedId === hit.id) setEditingTextId(hit.id);
      setSelectedId(hit.id);
      remember();
      setDragState({ id: hit.id, start: point, shape: hit, mode: "move" });
      clearLongPress();
      return;
    }
    if (tool === "text") {
      const textShape = buildText(point, color);
      remember();
      applyShapes((current) => [...current, textShape]);
      setSelectedId(textShape.id);
      setEditingTextId(textShape.id);
      setTool("select");
      clearLongPress();
      return;
    }
    draftStartRef.current = point;
    setDraftStart(point);
    draftPointsRef.current = [point.x, point.y];
    setDraftPoints([point.x, point.y]);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (previous && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 6) clearLongPress();
    pendingMoveRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, previous };
    if (!rafRef.current) rafRef.current = window.requestAnimationFrame(flushPendingMove);
  }

  function flushPendingMove() {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const move = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (!move) return;
    processPointerMove(move);
  }

  function canPanGesture() {
    if (dragState) return false;
    if (draftStartRef.current && tool !== "select" && tool !== "text") return false;
    return transformRef.current.scale > 1.01 || !markupEnabled;
  }

  function clampTransform(next: Transform): Transform {
    const scale = Math.min(4, Math.max(1, next.scale));
    if (scale <= 1.001) return { x: 0, y: 0, scale: 1 };
    return { ...next, scale };
  }

  function processPointerMove(move: PendingMove) {
    if (pointersRef.current.size === 2 && pinchRef.current) {
      updateTransform(clampTransform(computePinchTransform(pointersRef.current, pinchRef.current)));
      return;
    }
    if (canPanGesture() && panRef.current) {
      updateTransform(computePanTransform(panRef.current, move.clientX, move.clientY));
      if (!markupEnabled) return;
    }
    if (!markupEnabled) return;
    clearLongPress();
    if (dragState) {
      const point = toPoint(move.clientX, move.clientY);
      const nextShapes = shapesRef.current.map((shape) => {
        if (shape.id !== dragState.id) return shape;
        if (dragState.mode === "resize") return resizeShapeFromHandle(shape, dragState.handle, point);
        return moveShape(dragState.shape, point.x - dragState.start.x, point.y - dragState.start.y);
      });
      shapesRef.current = nextShapes;
      setShapes(nextShapes);
      return;
    }
    const currentDraftStart = draftStartRef.current;
    if (!currentDraftStart || tool === "select" || tool === "text") return;
    const point = toPoint(move.clientX, move.clientY);
    if (tool === "draw") setDraftPoints((current) => { const next = [...current, point.x, point.y]; draftPointsRef.current = next; return next; });
    else setDraftPoints(() => { const next = [currentDraftStart.x, currentDraftStart.y, point.x, point.y]; draftPointsRef.current = next; return next; });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    flushPendingMove();
    clearLongPress();
    const wasSinglePointer = pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect && wasSinglePointer && isDoubleTap(doubleTapRef.current, event.clientX, event.clientY)) {
      updateTransform(applyDoubleTapZoom(transformRef.current, event.clientX, event.clientY, rect));
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
      // Easy escape hatch: ending a pinch near 1× snaps cleanly back to fit.
      if (transformRef.current.scale < 1.12 && transformRef.current.scale !== 1) {
        updateTransform({ x: 0, y: 0, scale: 1 });
      }
    }
    panRef.current = reanchorPan(pointersRef.current, transformRef.current);
    if (dragState) { setDragState(null); emitMarkup(); return; }
    const finalDraftStart = draftStartRef.current;
    const finalDraftPoints = draftPointsRef.current;
    if (!finalDraftStart || finalDraftPoints.length < 4) {
      draftStartRef.current = null;
      setDraftStart(null);
      draftPointsRef.current = [];
      setDraftPoints([]);
      return;
    }
    const shape = buildShape(tool, finalDraftStart, finalDraftPoints, color, strokeWidth);
    if (shape) {
      remember();
      applyShapes((current) => [...current, shape]);
      setSelectedId(shape.id);
      if (tool !== "draw") setTool("select");
    }
    draftStartRef.current = null;
    setDraftStart(null);
    draftPointsRef.current = [];
    setDraftPoints([]);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateTransform((current) => applyWheelZoom(current, event.deltaY, 1, 4));
  }

  function beginShapeDrag(event: PointerEvent<SVGElement>, shape: MarkupShape) {
    if (!markupEnabled || tool !== "select") return;
    event.stopPropagation();
    if (shape.kind === "text" && selectedId === shape.id) setEditingTextId(shape.id);
    setSelectedId(shape.id);
    remember();
    setDragState({ id: shape.id, start: toPoint(event.clientX, event.clientY), shape, mode: "move" });
  }

  function beginSelectionResize(event: PointerEvent<SVGElement>, shape: MarkupShape, handle: ResizeHandle) {
    if (!markupEnabled || tool !== "select") return;
    event.stopPropagation();
    setSelectedId(shape.id);
    remember();
    setDragState({ id: shape.id, handle, mode: "resize" });
  }

  return {
    stageRef,
    shapes,
    selectedId,
    editingTextId,
    setEditingTextId,
    draftStart,
    draftPoints,
    portrait,
    setPortrait,
    transform,
    tool,
    color,
    strokeWidth,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    beginShapeDrag,
    beginSelectionResize,
    updateText,
    imagePctFromClient,
  };
}
