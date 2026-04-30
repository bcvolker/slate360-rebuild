import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import { VECTOR_TOOL_EVENT, type VectorTool } from "./UnifiedVectorToolbar";
import { buildShape, buildText, clamp, distance, findShapeAtPoint, MARKUP_HEIGHT, MARKUP_WIDTH, moveShape, type DraftPoint, type PointerPoint, type Transform } from "./markupCanvasGeometry";
import { recolorShape, resizeShapeFromHandle, setShapeStrokeWidth, type ResizeHandle } from "./markupShapeEdits";

export type DraftPin = { xPct: number; yPct: number } | null;

type DragState = { id: string; start: DraftPoint; shape: MarkupShape; mode: "move" } | { id: string; handle: ResizeHandle; mode: "resize" };
type PendingMove = { pointerId: number; clientX: number; clientY: number; previous?: PointerPoint };

type UseMarkupCanvasStateArgs = { imageUrl: string; markupEnabled: boolean; initialMarkup?: MarkupData | null; onMarkupChange?: (markup: MarkupData) => void };

export const PHOTO_MARKUP_UNDO_EVENT = "site-walk-photo-markup-undo";
export const PHOTO_MARKUP_REDO_EVENT = "site-walk-photo-markup-redo";

export function useMarkupCanvasState({ imageUrl, markupEnabled, initialMarkup, onMarkupChange }: UseMarkupCanvasStateArgs) {
  const stageRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; origin: Transform } | null>(null);
  const undoRef = useRef<MarkupShape[][]>([]);
  const redoRef = useRef<MarkupShape[][]>([]);
  const shapesRef = useRef<MarkupShape[]>(initialMarkup?.shapes ?? []);
  const selectedIdRef = useRef<string | null>(null);
  const draftStartRef = useRef<DraftPoint | null>(null);
  const draftPointsRef = useRef<number[]>([]);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<VectorTool>("select");
  const [color, setColor] = useState("#3B82F6");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [shapes, setShapes] = useState<MarkupShape[]>(initialMarkup?.shapes ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState<DraftPoint | null>(null);
  const [draftPoints, setDraftPoints] = useState<number[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draftPin, setDraftPin] = useState<DraftPin>(null);
  const [portrait, setPortrait] = useState(false);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    function handleTool(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const nextTool = typeof detail?.tool === "string" ? detail.tool : "draw";
      if (detail?.deleteSelected) deleteSelected();
      if (["select", "draw", "box", "circle", "arrow", "text"].includes(nextTool)) setTool(nextTool as VectorTool);
      if (typeof detail?.color === "string") {
        setColor(detail.color);
        editSelectedShape((shape) => recolorShape(shape, detail.color));
      }
      if (typeof detail?.strokeWidth === "number") {
        setStrokeWidth(detail.strokeWidth);
        editSelectedShape((shape) => setShapeStrokeWidth(shape, detail.strokeWidth));
      }
    }
    window.addEventListener(VECTOR_TOOL_EVENT, handleTool);
    return () => window.removeEventListener(VECTOR_TOOL_EVENT, handleTool);
  }, []);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    window.addEventListener(PHOTO_MARKUP_UNDO_EVENT, undo);
    window.addEventListener(PHOTO_MARKUP_REDO_EVENT, redo);
    return () => {
      window.removeEventListener(PHOTO_MARKUP_UNDO_EVENT, undo);
      window.removeEventListener(PHOTO_MARKUP_REDO_EVENT, redo);
    };
  });

  useEffect(() => {
    const nextShapes = initialMarkup?.shapes ?? [];
    shapesRef.current = nextShapes;
    setShapes(nextShapes);
    setSelectedId(null);
    setEditingTextId(null);
    updateTransform({ x: 0, y: 0, scale: 1 });
  }, [imageUrl]);

  useEffect(() => () => { if (rafRef.current) window.cancelAnimationFrame(rafRef.current); }, []);

  function emitMarkup(nextShapes = shapesRef.current) { onMarkupChange?.({ version: 1, coordSpace: "image", shapes: nextShapes }); }

  function applyShapes(updater: (current: MarkupShape[]) => MarkupShape[], emit = true) {
    const nextShapes = updater(shapesRef.current);
    shapesRef.current = nextShapes;
    setShapes(nextShapes);
    if (emit) emitMarkup(nextShapes);
  }

  function updateTransform(nextTransform: Transform | ((current: Transform) => Transform)) {
    const resolved = typeof nextTransform === "function" ? nextTransform(transformRef.current) : nextTransform;
    transformRef.current = resolved; setTransform(resolved);
  }

  function updateDraftStart(nextStart: DraftPoint | null) { draftStartRef.current = nextStart; setDraftStart(nextStart); }

  function updateDraftPoints(nextPoints: number[] | ((current: number[]) => number[])) {
    const resolved = typeof nextPoints === "function" ? nextPoints(draftPointsRef.current) : nextPoints;
    draftPointsRef.current = resolved; setDraftPoints(resolved);
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

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    flushPendingMove();
    clearLongPress();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      clearLongPress();
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distance(a, b), scale: transform.scale };
      return;
    }
    panRef.current = { x: event.clientX, y: event.clientY, origin: transformRef.current };
    const point = toPoint(event.clientX, event.clientY);
    longPressRef.current = window.setTimeout(() => {
      updateDraftStart(null);
      updateDraftPoints([]);
      setDraftPin({ xPct: (point.x / MARKUP_WIDTH) * 100, yPct: (point.y / MARKUP_HEIGHT) * 100 });
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    }, 650);
    if (!markupEnabled) return;
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
    updateDraftStart(point);
    updateDraftPoints([point.x, point.y]);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (previous && Math.abs(event.clientX - previous.x) + Math.abs(event.clientY - previous.y) > 6) clearLongPress();
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

  function processPointerMove(move: PendingMove) {
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const scale = clamp((distance(a, b) / pinchRef.current.distance) * pinchRef.current.scale, 0.75, 4);
      updateTransform((current) => ({ ...current, scale }));
      return;
    }
    if (!markupEnabled) {
      if (panRef.current && transformRef.current.scale !== 1) updateTransform({ ...panRef.current.origin, x: panRef.current.origin.x + move.clientX - panRef.current.x, y: panRef.current.origin.y + move.clientY - panRef.current.y });
      return;
    }
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
    if (tool === "draw") updateDraftPoints((current) => [...current, point.x, point.y]);
    else updateDraftPoints([currentDraftStart.x, currentDraftStart.y, point.x, point.y]);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    flushPendingMove();
    clearLongPress();
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    panRef.current = null;
    if (dragState) {
      setDragState(null);
      emitMarkup();
      return;
    }
    const finalDraftStart = draftStartRef.current;
    const finalDraftPoints = draftPointsRef.current;
    if (!finalDraftStart || finalDraftPoints.length < 4) {
      updateDraftStart(null);
      updateDraftPoints([]);
      return;
    }
    const shape = buildShape(tool, finalDraftStart, finalDraftPoints, color, strokeWidth);
    if (shape) {
      remember();
      applyShapes((current) => [...current, shape]);
      setSelectedId(shape.id);
      if (tool !== "draw") setTool("select");
    }
    updateDraftStart(null);
    updateDraftPoints([]);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateTransform((current) => ({ ...current, scale: clamp(current.scale - event.deltaY * 0.002, 0.75, 4) }));
  }

  function beginShapeDrag(event: PointerEvent<SVGElement>, shape: MarkupShape) {
    if (!markupEnabled || tool !== "select") return;
    event.stopPropagation();
    flushPendingMove();
    if (shape.kind === "text" && selectedId === shape.id) setEditingTextId(shape.id);
    setSelectedId(shape.id);
    remember();
    setDragState({ id: shape.id, start: toPoint(event.clientX, event.clientY), shape, mode: "move" });
  }

  function beginSelectionResize(event: PointerEvent<SVGElement>, shape: MarkupShape, handle: ResizeHandle) {
    if (!markupEnabled || tool !== "select") return;
    event.stopPropagation();
    flushPendingMove();
    setSelectedId(shape.id);
    remember();
    setDragState({ id: shape.id, handle, mode: "resize" });
  }

  function deleteSelected() {
    const targetId = selectedIdRef.current;
    if (!targetId) return;
    remember();
    applyShapes((current) => current.filter((shape) => shape.id !== targetId));
    setSelectedId(null);
    setEditingTextId(null);
  }

  function editSelectedShape(update: (shape: MarkupShape) => MarkupShape) {
    const targetId = selectedIdRef.current;
    if (!targetId) return;
    remember(); applyShapes((current) => current.map((shape) => shape.id === targetId ? update(shape) : shape));
  }

  function updateText(id: string, text: string) {
    applyShapes((current) => current.map((shape) => shape.id === id && shape.kind === "text" ? { ...shape, text, updatedAt: Date.now() } : shape));
  }

  function remember(snapshot = shapesRef.current) { undoRef.current = [...undoRef.current.slice(-14), snapshot]; redoRef.current = []; }

  function undo() {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current = [shapesRef.current, ...redoRef.current.slice(0, 14)];
    shapesRef.current = previous; setShapes(previous); emitMarkup(previous);
  }

  function redo() {
    const next = redoRef.current.shift();
    if (!next) return;
    undoRef.current = [...undoRef.current.slice(-14), shapesRef.current];
    shapesRef.current = next; setShapes(next); emitMarkup(next);
  }

  return { stageRef, shapes, selectedId, editingTextId, setEditingTextId, draftStart, draftPoints, draftPin, setDraftPin, portrait, setPortrait, transform, tool, color, strokeWidth, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, beginShapeDrag, beginSelectionResize, updateText };
}
