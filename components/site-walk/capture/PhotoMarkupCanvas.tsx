"use client";

import { useEffect, useRef, useState } from "react";
import type { MarkupShape } from "@/lib/site-walk/markup-types";
import { VECTOR_TOOL_EVENT, type VectorTool } from "./UnifiedVectorToolbar";

type Props = {
  imageUrl: string;
  title: string;
};

type DraftPoint = { x: number; y: number };

const WIDTH = 1000;
const HEIGHT = 720;

export function PhotoMarkupCanvas({ imageUrl, title }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<VectorTool>("draw");
  const [color, setColor] = useState("#2563eb");
  const [shapes, setShapes] = useState<MarkupShape[]>([]);
  const [draftStart, setDraftStart] = useState<DraftPoint | null>(null);
  const [draftPoints, setDraftPoints] = useState<number[]>([]);

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

  function toPoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (tool === "select") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event.clientX, event.clientY);
    if (tool === "text") {
      setShapes((current) => [...current, buildText(point, color)]);
      return;
    }
    setDraftStart(point);
    setDraftPoints([point.x, point.y]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draftStart || tool === "select" || tool === "text") return;
    const point = toPoint(event.clientX, event.clientY);
    if (tool === "draw") setDraftPoints((current) => [...current, point.x, point.y]);
    else setDraftPoints([draftStart.x, draftStart.y, point.x, point.y]);
  }

  function handlePointerUp() {
    if (!draftStart || draftPoints.length < 4) {
      setDraftStart(null);
      setDraftPoints([]);
      return;
    }
    const shape = buildShape(tool, draftStart, draftPoints, color);
    if (shape) setShapes((current) => [...current, shape]);
    setDraftStart(null);
    setDraftPoints([]);
  }

  return (
    <div className="w-full text-left">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-800">Ready to mark up</p>
          <h2 className="line-clamp-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
        <button type="button" onClick={() => setShapes([])} disabled={shapes.length === 0} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50">Clear markup</button>
      </div>
      <div ref={stageRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-3xl border border-slate-300 bg-black">
        <img src={imageUrl} alt={title} className="h-full w-full select-none object-contain" draggable={false} />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
          {shapes.map((shape) => renderShape(shape))}
          {draftStart && draftPoints.length >= 4 && renderShape(buildShape(tool, draftStart, draftPoints, color), "draft")}
        </svg>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-600">Use the markup tools, then draw directly on the photo while the notes drawer stays open.</p>
    </div>
  );
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
  return { id: `text-${Date.now()}`, kind: "text", x: point.x, y: point.y, text: "Note", fontSize: 32, stroke: color, fill: "none", strokeWidth: 0, rotation: 0, updatedAt: Date.now() };
}

function renderShape(shape: MarkupShape | null, keySuffix = "") {
  if (!shape) return null;
  const key = `${shape.id}${keySuffix}`;
  if (shape.kind === "rect") return <rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "ellipse") return <ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "arrow") return <ArrowShape key={key} shape={shape} />;
  if (shape.kind === "text") return <text key={key} x={shape.x} y={shape.y} fill={shape.stroke} fontSize={shape.fontSize} fontWeight={800}>{shape.text}</text>;
  if (shape.kind === "freehand") return <polyline key={key} points={shape.points.join(" ")} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return null;
}

function ArrowShape({ shape }: { shape: Extract<MarkupShape, { kind: "arrow" }> }) {
  const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
  const left = `${shape.x2 - shape.headSize * Math.cos(angle - Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle - Math.PI / 6)}`;
  const right = `${shape.x2 - shape.headSize * Math.cos(angle + Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle + Math.PI / 6)}`;
  return <g><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}
