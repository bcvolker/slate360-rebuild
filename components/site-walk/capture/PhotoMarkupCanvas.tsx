"use client";

import { useEffect, useRef, useState } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { SelectionMenu, TextEditor } from "./PhotoMarkupControls";
import { PhotoAttachmentPins } from "./PhotoAttachmentPins";
import { VECTOR_TOOL_EVENT, type VectorTool } from "./UnifiedVectorToolbar";

export const PHOTO_MARKUP_UNDO_EVENT = "site-walk-photo-markup-undo", PHOTO_MARKUP_REDO_EVENT = "site-walk-photo-markup-redo";

type Props = {
  imageUrl: string;
  title: string;
  sessionId: string;
  markupEnabled: boolean;
  initialMarkup?: MarkupData | null;
  attachmentPins?: PhotoAttachmentPin[];
  onMarkupChange?: (markup: MarkupData) => void;
  onAttachmentPinsChange?: (pins: PhotoAttachmentPin[]) => void;
};

type DraftPoint = { x: number; y: number };
type DragState = { id: string; start: DraftPoint; shape: MarkupShape };
type DraftPin = { xPct: number; yPct: number } | null;
type Transform = { x: number; y: number; scale: number };
const WIDTH = 1000, HEIGHT = 720;

export function PhotoMarkupCanvas({ imageUrl, title, sessionId, markupEnabled, initialMarkup, attachmentPins = [], onMarkupChange, onAttachmentPinsChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; origin: Transform } | null>(null);
  const undoRef = useRef<MarkupShape[][]>([]);
  const redoRef = useRef<MarkupShape[][]>([]);
  const [tool, setTool] = useState<VectorTool>("select");
  const [color, setColor] = useState("#3B82F6");
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
      if (["select", "draw", "box", "circle", "arrow", "text"].includes(nextTool)) setTool(nextTool as VectorTool);
      if (typeof detail?.color === "string") setColor(detail.color);
    }
    window.addEventListener(VECTOR_TOOL_EVENT, handleTool);
    return () => window.removeEventListener(VECTOR_TOOL_EVENT, handleTool);
  }, []);

  useEffect(() => {
    window.addEventListener(PHOTO_MARKUP_UNDO_EVENT, undo);
    window.addEventListener(PHOTO_MARKUP_REDO_EVENT, redo);
    return () => { window.removeEventListener(PHOTO_MARKUP_UNDO_EVENT, undo); window.removeEventListener(PHOTO_MARKUP_REDO_EVENT, redo); };
  });

  useEffect(() => {
    onMarkupChange?.({ version: 1, coordSpace: "image", shapes });
  }, [onMarkupChange, shapes]);

  useEffect(() => {
    setShapes(initialMarkup?.shapes ?? []);
    setSelectedId(null);
    setEditingTextId(null);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [imageUrl, initialMarkup]);

  function clearLongPress() {
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }

  function toPoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (((clientX - rect.left - transform.x) / transform.scale) / rect.width) * WIDTH,
      y: (((clientY - rect.top - transform.y) / transform.scale) / rect.height) * HEIGHT,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    clearLongPress();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      clearLongPress();
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distance(a, b), scale: transform.scale };
      return;
    }
    panRef.current = { x: event.clientX, y: event.clientY, origin: transform };
    const point = toPoint(event.clientX, event.clientY);
    longPressRef.current = window.setTimeout(() => {
      setDraftStart(null);
      setDraftPoints([]);
      setDraftPin({ xPct: (point.x / WIDTH) * 100, yPct: (point.y / HEIGHT) * 100 });
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    }, 650);
    if (!markupEnabled) return;
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    if (tool === "text") {
      const textShape = buildText(point, color);
      remember();
      setShapes((current) => [...current, textShape]);
      setSelectedId(textShape.id);
      setEditingTextId(textShape.id);
      setTool("select");
      clearLongPress();
      return;
    }
    setDraftStart(point);
    setDraftPoints([point.x, point.y]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (previous && Math.abs(event.clientX - previous.x) + Math.abs(event.clientY - previous.y) > 6) clearLongPress();
    if (!markupEnabled) {
      if (pointersRef.current.size === 2 && pinchRef.current) {
        const [a, b] = Array.from(pointersRef.current.values());
        const scale = clamp((distance(a, b) / pinchRef.current.distance) * pinchRef.current.scale, 0.75, 4);
        setTransform((current) => ({ ...current, scale }));
        return;
      }
      if (panRef.current && transform.scale !== 1) setTransform({ ...panRef.current.origin, x: panRef.current.origin.x + event.clientX - panRef.current.x, y: panRef.current.origin.y + event.clientY - panRef.current.y });
      return;
    }
    clearLongPress();
    if (dragState) {
      const point = toPoint(event.clientX, event.clientY);
      setShapes((current) => current.map((shape) => shape.id === dragState.id ? moveShape(dragState.shape, point.x - dragState.start.x, point.y - dragState.start.y) : shape));
      return;
    }
    if (!draftStart || tool === "select" || tool === "text") return;
    const point = toPoint(event.clientX, event.clientY);
    if (tool === "draw") setDraftPoints((current) => [...current, point.x, point.y]);
    else setDraftPoints([draftStart.x, draftStart.y, point.x, point.y]);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    clearLongPress();
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    panRef.current = null;
    if (dragState) { setDragState(null); return; }
    if (!draftStart || draftPoints.length < 4) {
      setDraftStart(null);
      setDraftPoints([]);
      return;
    }
    const shape = buildShape(tool, draftStart, draftPoints, color);
    if (shape) {
      remember();
      setShapes((current) => [...current, shape]);
      setSelectedId(shape.id);
      setTool("select");
    }
    setDraftStart(null);
    setDraftPoints([]);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (markupEnabled) return;
    setTransform((current) => ({ ...current, scale: clamp(current.scale - event.deltaY * 0.002, 0.75, 4) }));
  }

  return (
    <div className="h-full w-full text-left">
      <div ref={stageRef} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className={`relative h-full min-h-[360px] w-full touch-none overflow-hidden bg-black ${portrait ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
        <img src={imageUrl} alt={title} onLoad={(event) => setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)} className="h-full w-full select-none object-cover" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }} draggable={false} />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
          {shapes.map((shape) => renderShape(shape, "", selectedId === shape.id, (event) => beginShapeDrag(event, shape)))}
          {draftStart && draftPoints.length >= 4 && renderShape(buildShape(tool, draftStart, draftPoints, color), "draft", false)}
        </svg>
        <PhotoAttachmentPins sessionId={sessionId} pins={attachmentPins} draftPin={draftPin} onDraftClose={() => setDraftPin(null)} onPinsChange={(pins) => onAttachmentPinsChange?.(pins)} />
        {editingTextId && <TextEditor shape={shapes.find((shape) => shape.id === editingTextId)} onChange={(value) => updateText(editingTextId, value)} onDone={() => setEditingTextId(null)} />}
        {selectedId && <SelectionMenu onDelete={deleteSelected} onBigger={() => resizeSelected(1.14)} onSmaller={() => resizeSelected(0.88)} onEditText={() => setEditingTextId(selectedId)} />}
      </div>
    </div>
  );

  function beginShapeDrag(event: React.PointerEvent<SVGElement>, shape: MarkupShape) {
    if (!markupEnabled || tool !== "select") return;
    event.stopPropagation();
    setSelectedId(shape.id);
    remember();
    setDragState({ id: shape.id, start: toPoint(event.clientX, event.clientY), shape });
  }

  function deleteSelected() {
    remember();
    setShapes((current) => current.filter((shape) => shape.id !== selectedId));
    setSelectedId(null);
    setEditingTextId(null);
  }

  function resizeSelected(scale: number) {
    remember();
    setShapes((current) => current.map((shape) => shape.id === selectedId ? resizeShape(shape, scale) : shape));
  }

  function updateText(id: string, text: string) {
    setShapes((current) => current.map((shape) => shape.id === id && shape.kind === "text" ? { ...shape, text, updatedAt: Date.now() } : shape));
  }

  function remember() {
    undoRef.current = [...undoRef.current.slice(-14), shapes];
    redoRef.current = [];
  }

  function undo() {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current = [shapes, ...redoRef.current.slice(0, 14)];
    setShapes(previous);
  }

  function redo() {
    const next = redoRef.current.shift();
    if (!next) return;
    undoRef.current = [...undoRef.current.slice(-14), shapes];
    setShapes(next);
  }
}

function buildShape(tool: VectorTool, start: DraftPoint, points: number[], color: string): MarkupShape | null {
  const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, stroke: color, fill: "none", strokeWidth: 5, rotation: 0, updatedAt: Date.now() };
  const endX = points[points.length - 2] ?? start.x;
  const endY = points[points.length - 1] ?? start.y;
  if (tool === "box") return { ...base, kind: "rect", x: Math.min(start.x, endX), y: Math.min(start.y, endY), width: Math.abs(endX - start.x), height: Math.abs(endY - start.y) };
  if (tool === "circle") return { ...base, kind: "ellipse", cx: (start.x + endX) / 2, cy: (start.y + endY) / 2, rx: Math.abs(endX - start.x) / 2, ry: Math.abs(endY - start.y) / 2 };
  if (tool === "arrow") return { ...base, kind: "arrow", x1: start.x, y1: start.y, x2: endX, y2: endY, headSize: 28 };
  if (tool === "draw") return { ...base, kind: "freehand", points };
  return null;
}

function buildText(point: DraftPoint, color: string): MarkupShape {
  return { id: `text-${Date.now()}`, kind: "text", x: point.x, y: point.y, text: "", fontSize: 36, stroke: color, fill: "none", strokeWidth: 0, rotation: 0, updatedAt: Date.now() };
}

function renderShape(shape: MarkupShape | null, keySuffix = "", selected = false, onPointerDown?: (event: React.PointerEvent<SVGElement>) => void) {
  if (!shape) return null;
  const key = `${shape.id}${keySuffix}`;
  const common = { onPointerDown, className: "cursor-move", filter: selected ? "drop-shadow(0 0 8px rgba(59,130,246,.9))" : undefined };
  if (shape.kind === "rect") return <rect key={key} {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} />;
  if (shape.kind === "ellipse") return <ellipse key={key} {...common} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} />;
  if (shape.kind === "arrow") return <ArrowShape key={key} shape={shape} selected={selected} onPointerDown={onPointerDown} />;
  if (shape.kind === "text") return <text key={key} {...common} x={shape.x} y={shape.y} fill={shape.stroke} fontSize={shape.fontSize} fontWeight={800}>{shape.text || "Tap to type"}</text>;
  if (shape.kind === "freehand") return <polyline key={key} {...common} points={shape.points.join(" ")} fill="none" stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return null;
}

function ArrowShape({ shape, selected = false, onPointerDown }: { shape: Extract<MarkupShape, { kind: "arrow" }>; selected?: boolean; onPointerDown?: (event: React.PointerEvent<SVGElement>) => void }) {
  const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
  const left = `${shape.x2 - shape.headSize * Math.cos(angle - Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle - Math.PI / 6)}`;
  const right = `${shape.x2 - shape.headSize * Math.cos(angle + Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle + Math.PI / 6)}`;
  return <g onPointerDown={onPointerDown} className="cursor-move" filter={selected ? "drop-shadow(0 0 8px rgba(59,130,246,.9))" : undefined}><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveShape(shape: MarkupShape, dx: number, dy: number): MarkupShape {
  if (shape.kind === "rect") return { ...shape, x: shape.x + dx, y: shape.y + dy, updatedAt: Date.now() };
  if (shape.kind === "ellipse") return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy, updatedAt: Date.now() };
  if (shape.kind === "text") return { ...shape, x: shape.x + dx, y: shape.y + dy, updatedAt: Date.now() };
  if (shape.kind === "arrow" || shape.kind === "line") return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy, updatedAt: Date.now() };
  return { ...shape, points: shape.points.map((value, index) => value + (index % 2 === 0 ? dx : dy)), updatedAt: Date.now() };
}

function resizeShape(shape: MarkupShape, scale: number): MarkupShape {
  if (shape.kind === "rect") return { ...shape, width: shape.width * scale, height: shape.height * scale, updatedAt: Date.now() };
  if (shape.kind === "ellipse") return { ...shape, rx: shape.rx * scale, ry: shape.ry * scale, updatedAt: Date.now() };
  if (shape.kind === "text") return { ...shape, fontSize: Math.max(14, shape.fontSize * scale), updatedAt: Date.now() };
  if (shape.kind === "arrow") return { ...shape, x2: shape.x1 + (shape.x2 - shape.x1) * scale, y2: shape.y1 + (shape.y2 - shape.y1) * scale, headSize: shape.headSize * scale, updatedAt: Date.now() };
  if (shape.kind === "line") return { ...shape, x2: shape.x1 + (shape.x2 - shape.x1) * scale, y2: shape.y1 + (shape.y2 - shape.y1) * scale, updatedAt: Date.now() };
  return { ...shape, strokeWidth: Math.max(2, shape.strokeWidth * scale), updatedAt: Date.now() };
}
// End of active photo markup canvas.
