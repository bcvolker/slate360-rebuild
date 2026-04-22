"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Square, ArrowUpRight, Type, Undo2, Trash2 } from "lucide-react";

type Tool = "arrow" | "box" | "text";

interface ShapeBase {
  id: string;
  type: Tool;
  color: string;
  strokeWidth: number;
}
interface ArrowShape extends ShapeBase {
  type: "arrow";
  x1: number; y1: number; x2: number; y2: number;
}
interface BoxShape extends ShapeBase {
  type: "box";
  x: number; y: number; w: number; h: number;
}
interface TextShape extends ShapeBase {
  type: "text";
  x: number; y: number; text: string; fontSize: number;
}
type Shape = ArrowShape | BoxShape | TextShape;

export interface MarkupCanvasProps {
  imageUrl: string;
  /** width/height of the underlying image; we render the SVG with these dims. */
  width?: number;
  height?: number;
  initialSvg?: string | null;
  onChange?: (svg: string) => void;
}

export interface MarkupCanvasHandle {
  getSvg: () => string;
}

/**
 * Minimal SVG-based markup canvas for site-walk photos.
 * Output is a self-contained SVG string suitable for storage in
 * site_walk_items.metadata.markupSvg and overlay rendering anywhere.
 */
export default function MarkupCanvas({
  imageUrl,
  width = 1280,
  height = 960,
  onChange,
}: MarkupCanvasProps) {
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState("#ef4444");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [drawing, setDrawing] = useState<Shape | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const emit = useCallback(
    (next: Shape[]) => {
      if (!onChange) return;
      const body = next.map(renderShape).join("");
      onChange(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`,
      );
    },
    [onChange, width, height],
  );

  const toCoords = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    return { x, y };
  };

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === "text") return; // text is added via prompt below
    const p = toCoords(e);
    if (!p) return;
    const id = crypto.randomUUID();
    if (tool === "arrow") {
      setDrawing({ id, type: "arrow", color, strokeWidth: 6, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    } else {
      setDrawing({ id, type: "box", color, strokeWidth: 6, x: p.x, y: p.y, w: 0, h: 0 });
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    const p = toCoords(e);
    if (!p) return;
    if (drawing.type === "arrow") setDrawing({ ...drawing, x2: p.x, y2: p.y });
    else if (drawing.type === "box") setDrawing({ ...drawing, w: p.x - drawing.x, h: p.y - drawing.y });
  }

  function onPointerUp() {
    if (!drawing) return;
    const next = [...shapes, drawing];
    setShapes(next);
    setDrawing(null);
    emit(next);
  }

  function addText(e: React.MouseEvent<SVGSVGElement>) {
    if (tool !== "text") return;
    const p = toCoords(e as unknown as React.PointerEvent<SVGSVGElement>);
    if (!p) return;
    const text = window.prompt("Label text");
    if (!text?.trim()) return;
    const next: Shape[] = [
      ...shapes,
      { id: crypto.randomUUID(), type: "text", color, strokeWidth: 0, x: p.x, y: p.y, text: text.trim(), fontSize: 32 },
    ];
    setShapes(next);
    emit(next);
  }

  function undo() {
    const next = shapes.slice(0, -1);
    setShapes(next);
    emit(next);
  }
  function clearAll() {
    setShapes([]);
    emit([]);
  }

  const colors = useMemo(() => ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ffffff"], []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <ToolBtn active={tool === "arrow"} onClick={() => setTool("arrow")} icon={<ArrowUpRight className="h-4 w-4" />} label="Arrow" />
        <ToolBtn active={tool === "box"} onClick={() => setTool("box")} icon={<Square className="h-4 w-4" />} label="Box" />
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} icon={<Type className="h-4 w-4" />} label="Text" />
        <div className="flex items-center gap-1 ml-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-cobalt" : "border-white/20"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!shapes.length} className="px-2 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 inline-flex items-center gap-1">
            <Undo2 className="h-3 w-3" /> Undo
          </button>
          <button type="button" onClick={clearAll} disabled={!shapes.length} className="px-2 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-red-500/10 disabled:opacity-40 inline-flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        </div>
      </div>

      <div className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-black select-none touch-none">
        {/* Photo background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="capture" className="block w-full h-auto" />
        {/* Markup overlay */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={addText}
        >
          <defs>
            {colors.map((c) => (
              <marker key={c} id={`arrow-${c.replace("#", "")}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {[...shapes, ...(drawing ? [drawing] : [])].map((s) => renderShapeReact(s))}
        </svg>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${
        active ? "border-cobalt/50 bg-cobalt/15 text-cobalt-foreground" : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function renderShapeReact(s: Shape) {
  if (s.type === "arrow") {
    return (
      <line
        key={s.id}
        x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
        stroke={s.color} strokeWidth={s.strokeWidth} strokeLinecap="round"
        markerEnd={`url(#arrow-${s.color.replace("#", "")})`}
      />
    );
  }
  if (s.type === "box") {
    const x = s.w < 0 ? s.x + s.w : s.x;
    const y = s.h < 0 ? s.y + s.h : s.y;
    return (
      <rect key={s.id} x={x} y={y} width={Math.abs(s.w)} height={Math.abs(s.h)} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} />
    );
  }
  return (
    <text key={s.id} x={s.x} y={s.y} fill={s.color} fontSize={s.fontSize} fontWeight={700} stroke="#000" strokeWidth={1} paintOrder="stroke">
      {s.text}
    </text>
  );
}

function renderShape(s: Shape): string {
  if (s.type === "arrow") {
    return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.color}" stroke-width="${s.strokeWidth}" stroke-linecap="round" marker-end="url(#arrow-${s.color.replace("#", "")})" />`;
  }
  if (s.type === "box") {
    const x = s.w < 0 ? s.x + s.w : s.x;
    const y = s.h < 0 ? s.y + s.h : s.y;
    return `<rect x="${x}" y="${y}" width="${Math.abs(s.w)}" height="${Math.abs(s.h)}" fill="none" stroke="${s.color}" stroke-width="${s.strokeWidth}" />`;
  }
  return `<text x="${s.x}" y="${s.y}" fill="${s.color}" font-size="${s.fontSize}" font-weight="700" stroke="#000" stroke-width="1" paint-order="stroke">${escapeXml(s.text)}</text>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c));
}
