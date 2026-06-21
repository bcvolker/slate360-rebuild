"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Magnet, Scissors, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore, layoutClips } from "./editor-store";
import { useMediaUpload } from "./use-media-upload";
import { ClipContextMenu } from "./ClipContextMenu";

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
  const snap = useEditorStore((s) => s.snap);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const setClipTrim = useEditorStore((s) => s.setClipTrim);
  const moveClipTo = useEditorStore((s) => s.moveClipTo);
  const commitClips = useEditorStore((s) => s.commitClips);

  const { uploadFiles } = useMediaUpload();
  const scrollRef = useRef<HTMLDivElement>(null);
  const draggingPlayhead = useRef(false);
  const trimDrag = useRef<null | { id: string; edge: "in" | "out"; startX: number; inSec: number; outSec: number }>(null);
  const moveDrag = useRef<null | { id: string; startX: number; moved: boolean }>(null);
  const [menu, setMenu] = useState<{ clipId: string; x: number; y: number } | null>(null);

  // Reorder a dragged clip: place it among the others by pointer position.
  const reorderToPointer = useCallback(
    (clientX: number, id: string) => {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = (clientX - rect.left + el.scrollLeft - LABEL_W) / pxPerSec;
      const { rows } = layoutClips(useEditorStore.getState().clips);
      let idx = 0;
      for (const r of rows) {
        if (r.clip.id === id) continue;
        if (t > r.startSec + r.lengthSec / 2) idx += 1;
      }
      moveClipTo(id, idx);
    },
    [pxPerSec, moveClipTo],
  );
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

  // Window-tracked pointer drags: playhead scrub AND clip edge trim (work past edges).
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (draggingPlayhead.current) { seekFromClientX(e.clientX); return; }
      const t = trimDrag.current;
      if (t) {
        const deltaSec = (e.clientX - t.startX) / pxPerSec;
        if (t.edge === "in") setClipTrim(t.id, { trimInSec: t.inSec + deltaSec });
        else setClipTrim(t.id, { trimOutSec: t.outSec + deltaSec });
        return;
      }
      const m = moveDrag.current;
      if (m) {
        if (!m.moved && Math.abs(e.clientX - m.startX) > 4) {
          m.moved = true;
          useEditorStore.temporal.getState().pause(); // don't snapshot every micro-move
        }
        if (m.moved) reorderToPointer(e.clientX, m.id);
      }
    };
    const up = () => {
      draggingPlayhead.current = false;
      trimDrag.current = null;
      const m = moveDrag.current;
      if (m?.moved) {
        useEditorStore.temporal.getState().resume();
        commitClips(); // record the whole reorder as ONE undo step
      }
      moveDrag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [seekFromClientX, pxPerSec, setClipTrim, reorderToPointer, commitClips]);

  // Delete selected clip with keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) removeClip(selectedClipId);
      else if (e.key === "b" || e.key === "B") { if (!e.metaKey && !e.ctrlKey) splitAtPlayhead(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClipId, removeClip, splitAtPlayhead]);

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
        <button
          type="button"
          onClick={splitAtPlayhead}
          title="Split at playhead (B)"
          className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] hover:bg-white/5"
        >
          <Scissors className="h-3 w-3" /> Split
        </button>
        <button
          type="button"
          onClick={toggleSnap}
          title="Toggle snapping"
          className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
            snap ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white" : "border-white/10 hover:bg-white/5"
          }`}
        >
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
                onContextMenu={(e) => { e.preventDefault(); selectClip(clip.id); setMenu({ clipId: clip.id, x: e.clientX, y: e.clientY }); }}
                onPointerDown={(e) => { e.stopPropagation(); selectClip(clip.id); moveDrag.current = { id: clip.id, startX: e.clientX, moved: false }; }}
                style={{ left: LABEL_W + startSec * pxPerSec, width: Math.max(40, lengthSec * pxPerSec) }}
                className={`group absolute top-2 bottom-2 cursor-grab overflow-hidden rounded-md border active:cursor-grabbing ${
                  selectedClipId === clip.id ? "border-[#3D8EFF] bg-[#3D8EFF]/25" : "border-white/15 bg-white/[0.07] hover:border-white/30"
                }`}
              >
                <span className="block truncate px-3 py-1 pr-5 text-[10px] text-white/85">{clip.name}</span>
                {/* Trim handles — wide grab zone + always-faint grip bar that brightens on hover */}
                <div
                  title="Trim start"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    trimDrag.current = { id: clip.id, edge: "in", startX: e.clientX, inSec: clip.trimInSec, outSec: clip.trimOutSec };
                  }}
                  className="absolute inset-y-0 left-0 flex w-3 cursor-ew-resize items-center justify-center bg-black/25 hover:bg-[#3D8EFF]/60"
                >
                  <span className="h-4 w-0.5 rounded bg-white/50" />
                </div>
                <div
                  title="Trim end"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    trimDrag.current = { id: clip.id, edge: "out", startX: e.clientX, inSec: clip.trimInSec, outSec: clip.trimOutSec };
                  }}
                  className="absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center bg-black/25 hover:bg-[#3D8EFF]/60"
                >
                  <span className="h-4 w-0.5 rounded bg-white/50" />
                </div>
                <button
                  type="button"
                  title="Remove from timeline"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                  className="absolute right-3.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-sm bg-black/50 text-white/70 opacity-0 hover:bg-black/80 hover:text-white group-hover:opacity-100"
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

      {menu && <ClipContextMenu clipId={menu.clipId} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
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
