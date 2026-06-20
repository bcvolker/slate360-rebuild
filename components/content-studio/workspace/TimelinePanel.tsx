"use client";

import { useRef } from "react";
import { Magnet, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore, layoutClips } from "./editor-store";
import { useMediaUpload } from "./use-media-upload";

const CLIP_DND = "application/x-cs-clip";

/** Bottom timeline: V1 sequential clip lane + playhead + zoom; accepts Media Bin drops. */
export function TimelinePanel() {
  const mode = useEditorStore((s) => s.mode);
  const clips = useEditorStore((s) => s.clips);
  const pxPerSec = useEditorStore((s) => s.pxPerSec);
  const playheadSec = useEditorStore((s) => s.playheadSec);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const selectClip = useEditorStore((s) => s.selectClip);
  const removeClip = useEditorStore((s) => s.removeClip);
  const addClip = useEditorStore((s) => s.addClip);
  const setZoom = useEditorStore((s) => s.setZoom);
  const pause = useEditorStore((s) => s.pause);

  const { uploadFiles } = useMediaUpload();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows, total } = layoutClips(clips);
  const contentWidth = Math.max(600, total * pxPerSec + 200);

  const extraLanes =
    mode === "360" ? ["Camera Path", "Audio"] : mode === "photo" ? ["Overlays"] : ["Audio", "Titles"];

  function seekFromEvent(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    pause();
    setPlayhead(x / pxPerSec);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    // OS files dropped from the computer → upload + ingest (appear in Media Bin when ready).
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
      return;
    }
    // Internal drag of a ready clip from the Media Bin → place on the timeline.
    const raw = e.dataTransfer.getData(CLIP_DND);
    if (!raw) return;
    try {
      const a = JSON.parse(raw) as { assetId: string; name: string; src: string; durationSec?: number };
      if (a.src) addClip(a);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-white/10 bg-[#0B0F15]/70">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-white/55">
        <button type="button" className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] hover:bg-white/5">
          <Magnet className="h-3 w-3" /> Snap
        </button>
        {selectedClipId && (
          <button
            type="button"
            onClick={() => removeClip(selectedClipId)}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5"
          >
            <Trash2 className="h-3 w-3" /> Delete clip
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconBtn icon={<ZoomOut className="h-3.5 w-3.5" />} onClick={() => setZoom(pxPerSec - 20)} />
          <span className="font-mono text-[11px] text-white/40">{pxPerSec}px/s</span>
          <IconBtn icon={<ZoomIn className="h-3.5 w-3.5" />} onClick={() => setZoom(pxPerSec + 20)} />
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div style={{ width: contentWidth }} className="relative">
          {/* Ruler (click to seek) */}
          <div onMouseDown={seekFromEvent} className="h-5 cursor-text border-b border-white/[0.06] bg-white/[0.02]" />

          {/* Video lane (interactive) */}
          <div
            onMouseDown={(e) => { if (e.target === e.currentTarget) seekFromEvent(e); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="relative flex h-14 items-center border-b border-white/[0.06]"
          >
            <LaneLabel>Video</LaneLabel>
            {rows.length === 0 && (
              <span className="pl-28 text-[11px] text-white/30">Drag clips here from the Media Bin</span>
            )}
            {rows.map(({ clip, startSec, lengthSec }) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => selectClip(clip.id)}
                style={{ left: 96 + startSec * pxPerSec, width: Math.max(24, lengthSec * pxPerSec) }}
                className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-md border text-left ${
                  selectedClipId === clip.id ? "border-[#3D8EFF] bg-[#3D8EFF]/20" : "border-white/15 bg-white/[0.06]"
                }`}
              >
                <span className="block truncate px-1.5 py-1 text-[10px] text-white/80">{clip.name}</span>
              </button>
            ))}
          </div>

          {/* Other lanes (placeholders until later slices) */}
          {extraLanes.map((lane) => (
            <div key={lane} className="relative flex h-9 items-center border-b border-white/[0.06]">
              <LaneLabel>{lane}</LaneLabel>
            </div>
          ))}

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#3D8EFF]"
            style={{ left: 96 + playheadSec * pxPerSec }}
          />
        </div>
      </div>
    </div>
  );
}

function LaneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-0 bottom-0 z-10 flex w-24 items-center border-r border-white/10 bg-[#0B0F15] px-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function IconBtn({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/55 hover:bg-white/5">
      {icon}
    </button>
  );
}
