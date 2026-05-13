"use client";

import { useState } from "react";
import { ArrowUpRight, Circle, MousePointer2, Pencil, Square, Trash2, Type } from "lucide-react";

export type VectorTool = "select" | "draw" | "box" | "circle" | "arrow" | "text";

const TOOLS = [
  { label: "Select", value: "select", icon: MousePointer2 },
  { label: "Draw", value: "draw", icon: Pencil },
  { label: "Box", value: "box", icon: Square },
  { label: "Circle", value: "circle", icon: Circle },
  { label: "Arrow", value: "arrow", icon: ArrowUpRight },
  { label: "Text", value: "text", icon: Type },
] satisfies Array<{ label: string; value: VectorTool; icon: typeof MousePointer2 }>;

const COLORS = ["#F59E0B", "#94A3B8", "#ef4444", "#a855f7", "#f8fafc"];
const STROKE_WIDTHS = [3, 5, 8, 12];

export const VECTOR_TOOL_EVENT = "site-walk-vector-tool";

function publishVectorTool(tool: VectorTool, color: string, strokeWidth: number, deleteSelected = false) {
  window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool, color, strokeWidth, deleteSelected } }));
}

export function UnifiedVectorToolbar({ disabled = false }: { disabled?: boolean }) {
  const [activeTool, setActiveTool] = useState<VectorTool>("select");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(5);

  function selectTool(tool: VectorTool) {
    setActiveTool(tool);
    publishVectorTool(tool, activeColor, activeStrokeWidth);
  }

  function selectColor(color: string) {
    setActiveColor(color);
    publishVectorTool(activeTool, color, activeStrokeWidth);
  }

  function selectStrokeWidth(width: number) {
    setActiveStrokeWidth(width);
    publishVectorTool(activeTool, activeColor, width);
  }

  return (
    <section className={`rounded-2xl border border-white/12 bg-white/[0.07] p-1.5 shadow-sm backdrop-blur-xl transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`} aria-label="Vector markup toolbar" aria-disabled={disabled}>
      <h2 className="sr-only">Markup tools</h2>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.value;
          return (
            <button key={tool.label} type="button" onClick={() => selectTool(tool.value)} disabled={disabled} className={`flex h-8 min-w-8 items-center justify-center rounded-xl border px-2 text-xs font-black ${isActive ? "border-amber-500 bg-amber-500/20 text-amber-100" : "border-white/10 bg-black/20 text-white/70 hover:border-amber-400"}`} aria-label={tool.label}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="Markup colors and line width">
        {COLORS.map((color) => <button key={color} type="button" onClick={() => selectColor(color)} disabled={disabled} className={`h-6 w-6 shrink-0 rounded-full border-2 ${activeColor === color ? "border-amber-300" : "border-white/40 shadow"}`} style={{ backgroundColor: color }} aria-label={`Use markup color ${color}`} />)}
        <span className="h-5 w-px shrink-0 bg-white/15" />
        {STROKE_WIDTHS.map((width) => <button key={width} type="button" onClick={() => selectStrokeWidth(width)} disabled={disabled} className={`h-6 shrink-0 rounded-full border px-2 text-[9px] font-black ${activeStrokeWidth === width ? "border-cyan-300 bg-cyan-300/20 text-cyan-100" : "border-white/15 bg-black/20 text-white/70"}`} aria-label={`Set line width ${width}`}>{width}</button>)}
        <button type="button" onClick={() => publishVectorTool(activeTool, activeColor, activeStrokeWidth, true)} disabled={disabled} className="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-rose-300/30 bg-rose-500/10 px-2 text-[9px] font-black text-rose-100" aria-label="Delete selected markup"><Trash2 className="h-3 w-3" /> Delete</button>
      </div>
    </section>
  );
}
