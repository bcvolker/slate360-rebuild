"use client";

import { Clapperboard, RotateCcw, Upload } from "lucide-react";
import { useEditorStore, type EditorMode } from "./editor-store";

const MODES: { id: EditorMode; label: string }[] = [
  { id: "video", label: "Regular" },
  { id: "360", label: "360" },
  { id: "photo", label: "Photo" },
];

/** Top command bar (44px): brand, project, mode switcher, render status, actions. */
export function CommandBar({ projectTitle }: { projectTitle: string }) {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const resetLayout = useEditorStore((s) => s.resetLayout);

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0B0F15]/80 px-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Clapperboard className="h-4 w-4 text-[#3D8EFF]" />
        <span className="font-[var(--font-orbitron,inherit)] tracking-wide">Content Studio</span>
        <span className="text-white/30">·</span>
        <span className="max-w-[220px] truncate text-white/70">{projectTitle}</span>
      </div>

      {/* Mode switcher — rectangular segmented tabs (no pills) */}
      <div className="ml-2 flex items-center overflow-hidden rounded-md border border-white/10">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === m.id
                ? "bg-[#3D8EFF]/20 text-white"
                : "text-white/55 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Render status strip (placeholder until the job loop lands in Slice 5) */}
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          proxy idle
        </span>
        <button
          type="button"
          onClick={resetLayout}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
          title="Reset layout"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Layout
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-1 text-xs font-semibold text-white hover:brightness-110"
        >
          <Upload className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}
