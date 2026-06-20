"use client";

import { useRef } from "react";
import { Pause, Play, Scissors, Type } from "lucide-react";
import { useEditorStore, layoutClips } from "./editor-store";
import { usePlayback } from "./use-playback";

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Center preview viewport (PROTECTED). Plays the composed timeline via proxies. */
export function PreviewPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  usePlayback(videoRef);

  const mode = useEditorStore((s) => s.mode);
  const clips = useEditorStore((s) => s.clips);
  const playing = useEditorStore((s) => s.playing);
  const playheadSec = useEditorStore((s) => s.playheadSec);
  const togglePlay = useEditorStore((s) => s.togglePlay);

  const total = layoutClips(clips).total;
  const hasClips = clips.length > 0;
  const label = mode === "360" ? "360 preview" : mode === "photo" ? "Photo canvas" : "Preview";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#070A0F]">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="relative flex aspect-video w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            ref={videoRef}
            className={hasClips ? "h-full w-full object-contain" : "hidden"}
            playsInline
            muted={false}
          />
          {!hasClips && (
            <div className="text-center text-xs text-white/35">
              <div className="font-mono uppercase tracking-[0.16em] text-white/40">{label}</div>
              <div className="mt-1 text-white/30">Import media, then drag or click a clip onto the timeline</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#0B0F15]/80 px-3">
        <button
          type="button"
          title={playing ? "Pause" : "Play"}
          onClick={togglePlay}
          disabled={!hasClips}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/70 hover:bg-white/5 disabled:opacity-40"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="px-2 font-mono text-[11px] tabular-nums text-white/55">
          {fmt(playheadSec)} / {fmt(total)}
        </span>
        <HudButton icon={<Scissors className="h-3.5 w-3.5" />} title="Split (timeline)" />
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
