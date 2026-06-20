"use client";

import { useCallback, useEffect, useRef } from "react";
import { Magnet, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore, layoutClips } from "./editor-store";
import { useMediaUpload } from "./use-media-upload";

const CLIP_DND = "application/x-cs-clip";
const LABEL_W = 96; // lane-label gutter width; timeline t=0 starts here

/** Bottom timeline: clip lane + draggable playhead + pinch/scroll zoom + drop target. */
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
  const draggingPlayhead = useRef(false);
  const { rows, total } = layoutClips(clips);
  const contentWidth = Math.max(600, total * pxPerSec + 240);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - LABEL_W;
      pause();
      setPlayhead(Math.max(0, x / pxPerSec));
    },
    [pause, setPlayhead, pxPerSec],
  );

  // Playhead drag-to-scrub (pointer move tracked on window so it works past edges).
  useEffect(() => {
    const move = (e: PointerEvent) => { if (draggingPlayhead.current) seekFromClientX(e.clientX); };
    const up = () => { draggingPlayhead.current = false; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [seekFromClientX]);

  // Delete selected clip with keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        removeClip(selectedClipId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClipId, removeClip]);

  function onWheel(e: React.WheelEvent) {
    // Trackpad pinch (ctrlKey) or Ctrl+wheel → zoom; otherwise native scroll.
    if (e.ctrlKey) {
      e.preventDefault();
      setZoom(pxPerSec - Math.sign(e.deltaY) * 16);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) { void uploadFiles(e.dataTransfer.files); return; }
    const raw = e.dataTransfer.getData(CLIP_DND);
    if (!raw) return;
    try {
      const a = JSON.parse(raw) as { assetId: string; name: string; src: string; durationSec?: number };
      if (a.src) addClip(a);
    } catch { /* ignore */ }
  }

  const extraLanes = mode === "360" ? ["Camera Path", "Audio"] : mode === "photo" ? ["Overlays"] : ["Audio", "Titles"];

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-white/10 bg-[#0B0F15]/70">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-white/55">
        <button type="button" className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] hover:bg-white/5">
          <Magnet className="h-3 w-3" /> Snap
        </button>
        {selectedClipId && (
          <button type="button" onClick={() => removeClip(selectedClipId)} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconBtn icon={<ZoomOut className="h-3.5 w-3.5" />} onClick={() => setZoom(pxPerSec - 20)} />
          <span className="font-mono text-[11px] text-white/40">{pxPerSec}px/s</span>
          <IconBtn icon={<ZoomIn className="h-3.5 w-3.5" />} onClick={() => setZoom(pxPerSec + 20)} />
        </div>
      </div>

      <div ref={scrollRef} onWheel={onWheel} className="relative min-h-0 flex-1 overflow-auto">
        <div style={{ width: contentWidth }} className="relative">
          {/* Ruler — pointer-drag to scrub */}
          <div
            onPointerDown={(e) => { draggingPlayhead.current = true; seekFromClientX(e.clientX); }}
            className="h-6 cursor-ew-resize border-b border-white/[0.06] bg-white/[0.03]"
          />

          {/* Video lane */}
          <div
            onPointerDown={(e) => { if (e.target === e.currentTarget) { draggingPlayhead.current = true; seekFromClientX(e.clientX); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="relative flex h-16 items-center border-b border-white/[0.06]"
          >
            <LaneLabel>Video</LaneLabel>
            {rows.length === 0 && <span className="pl-28 text-[11px] text-white/30">Click or drag clips here from the Media Bin</span>}
            {rows.map(({ clip, startSec, lengthSec }) => (
              <div
                key={clip.id}
                onClick={() => selectClip(clip.id)}
                style={{ left: LABEL_W + startSec * pxPerSec, width: Math.max(40, lengthSec * pxPerSec) }}
                className={`group absolute top-2 bottom-2 cursor-pointer overflow-hidden rounded-md border ${
                  selectedClipId === clip.id ? "border-[#3D8EFF] bg-[#3D8EFF]/25" : "border-white/15 bg-white/[0.07] hover:border-white/30"
                }`}
              >
                <span className="block truncate px-1.5 py-1 pr-5 text-[10px] text-white/85">{clip.name}</span>
                <button
                  type="button"
                  title="Remove from timeline"
                  onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-sm bg-black/50 text-white/70 opacity-0 hover:bg-black/80 hover:text-white group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>

          {extraLanes.map((lane) => (
            <div key={lane} className="relative flex h-9 items-center border-b border-white/[0.06]">
              <LaneLabel>{lane}</LaneLabel>
            </div>
          ))}

          <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-[#3D8EFF]" style={{ left: LABEL_W + playheadSec * pxPerSec }}>
            <div className="absolute -left-1 -top-0 h-2 w-2 rounded-sm bg-[#3D8EFF]" />
          </div>
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
