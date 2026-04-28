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

const COLORS = ["#2563eb", "#dc2626", "#f59e0b", "#16a34a", "#111827"];

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
    <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm" aria-label="Vector markup toolbar">
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Markup tools</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.value;
          return (
            <button key={tool.label} type="button" onClick={() => selectTool(tool.value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold xl:justify-start ${isActive ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-300"}`}>
              <Icon className="h-4 w-4 text-blue-800" />
              <span className="hidden xl:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Markup colors">
        {COLORS.map((color) => <button key={color} type="button" onClick={() => selectColor(color)} className={`h-8 w-8 rounded-full border-2 ${activeColor === color ? "border-slate-950" : "border-white shadow ring-1 ring-slate-300"}`} style={{ backgroundColor: color }} aria-label={`Use markup color ${color}`} />)}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">Select a tool, then draw on the active photo or tap the plan to store markup JSON.</p>
    </section>
  );
}
