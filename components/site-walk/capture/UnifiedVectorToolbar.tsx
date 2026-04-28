"use client";

import { useState } from "react";
import { ArrowUpRight, Circle, MousePointer2, Pencil, Square, Type } from "lucide-react";

export type VectorTool = "select" | "draw" | "box" | "circle" | "arrow" | "text";

const TOOLS = [
  { label: "Select", value: "select", icon: MousePointer2 },
  { label: "Draw", value: "draw", icon: Pencil },
  { label: "Box", value: "box", icon: Square },
  { label: "Circle", value: "circle", icon: Circle },
  { label: "Arrow", value: "arrow", icon: ArrowUpRight },
  { label: "Text", value: "text", icon: Type },
] satisfies Array<{ label: string; value: VectorTool; icon: typeof MousePointer2 }>;

const COLORS = ["#3B82F6", "#94A3B8", "#ef4444", "#a855f7", "#f8fafc"];

export const VECTOR_TOOL_EVENT = "site-walk-vector-tool";

function publishVectorTool(tool: VectorTool, color: string) {
  window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool, color } }));
}

export function UnifiedVectorToolbar() {
  const [activeTool, setActiveTool] = useState<VectorTool>("select");
  const [activeColor, setActiveColor] = useState(COLORS[0]);

  function selectTool(tool: VectorTool) {
    setActiveTool(tool);
    publishVectorTool(tool, activeColor);
  }

  function selectColor(color: string) {
    setActiveColor(color);
    publishVectorTool(activeTool, color);
  }

  return (
    <section className="rounded-3xl border border-white/15 bg-white/10 p-2 shadow-sm backdrop-blur-xl" aria-label="Vector markup toolbar">
      <h2 className="sr-only">Markup tools</h2>
      <div className="grid grid-cols-6 gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.value;
          return (
            <button key={tool.label} type="button" onClick={() => selectTool(tool.value)} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-black ${isActive ? "border-blue-500 bg-blue-500/20 text-blue-100" : "border-white/10 bg-black/20 text-white/70 hover:border-blue-400"}`} aria-label={tool.label}>
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Markup colors">
        {COLORS.map((color) => <button key={color} type="button" onClick={() => selectColor(color)} className={`h-7 w-7 rounded-full border-2 ${activeColor === color ? "border-blue-300" : "border-white/40 shadow"}`} style={{ backgroundColor: color }} aria-label={`Use markup color ${color}`} />)}
      </div>
      <p className="mt-2 text-[11px] font-bold leading-4 text-white/55">Select moves, resizes, edits, or deletes. Long-press photo to pin files.</p>
    </section>
  );
}
