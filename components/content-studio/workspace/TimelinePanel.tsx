"use client";

import { Magnet, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore } from "./editor-store";

/** Bottom timeline (PROTECTED). Static lane scaffold until the magnetic timeline (Slice 7). */
export function TimelinePanel() {
  const mode = useEditorStore((s) => s.mode);

  const lanes =
    mode === "360"
      ? ["Titles", "Video", "Camera Path", "Audio", "Music"]
      : mode === "photo"
        ? ["Batch", "Overlays"]
        : ["Titles", "Video", "Audio", "Music", "VO"];

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-white/10 bg-[#0B0F15]/70">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-white/55">
        <button type="button" className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] hover:bg-white/5">
          <Magnet className="h-3 w-3" /> Snap
        </button>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn icon={<ZoomOut className="h-3.5 w-3.5" />} />
          <span className="font-mono text-[11px] text-white/40">100%</span>
          <IconBtn icon={<ZoomIn className="h-3.5 w-3.5" />} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {lanes.map((lane) => (
          <div key={lane} className="flex h-10 items-center border-b border-white/[0.06]">
            <div className="flex h-full w-24 shrink-0 items-center border-r border-white/10 px-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
              {lane}
            </div>
            <div className="h-full flex-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_59px,rgba(255,255,255,0.04)_60px)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function IconBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/55 hover:bg-white/5"
    >
      {icon}
    </button>
  );
}
