"use client";

import { Pause, Play, Scissors, Type } from "lucide-react";
import { useEditorStore } from "./editor-store";

/**
 * Center preview viewport (PROTECTED — never closes). Static placeholder until the
 * compositor lands in Slice 8; the HUD already shows the 5 one-click controls.
 */
export function PreviewPanel() {
  const mode = useEditorStore((s) => s.mode);

  const label =
    mode === "360" ? "360 preview" : mode === "photo" ? "Photo canvas" : "Preview";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#070A0F]">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded-lg border border-white/10 bg-[#0B0F15]">
          <div className="text-center text-xs text-white/35">
            <div className="font-mono uppercase tracking-[0.16em] text-white/40">{label}</div>
            <div className="mt-1 text-white/30">Import media and drop it on the timeline</div>
          </div>
        </div>
      </div>

      {/* HUD transport — five one-click controls */}
      <div className="flex h-9 shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#0B0F15]/80 px-3">
        <HudButton icon={<Play className="h-3.5 w-3.5" />} title="Play" />
        <HudButton icon={<Pause className="h-3.5 w-3.5" />} title="Pause" />
        <span className="px-2 font-mono text-[11px] tabular-nums text-white/45">
          00:00 / 00:00
        </span>
        <HudButton icon={<Scissors className="h-3.5 w-3.5" />} title="Split" />
        <HudButton icon={<Type className="h-3.5 w-3.5" />} title="Add title" />
      </div>
    </div>
  );
}

function HudButton({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
    >
      {icon}
    </button>
  );
}
