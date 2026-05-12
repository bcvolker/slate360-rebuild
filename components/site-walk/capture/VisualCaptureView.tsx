"use client";

import Link from "next/link";
import { ArrowLeft, Ghost, LogOut, RotateCcw, RotateCw, Shapes } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAngleImageUrl, type PhotoAngleCaptureMode, type PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CameraViewfinder } from "./CameraViewfinder";
import { PhotoAngleStrip } from "./PhotoAngleStrip";
import { PHOTO_MARKUP_REDO_EVENT, PHOTO_MARKUP_UNDO_EVENT } from "./PhotoMarkupCanvas";
import { UnifiedVectorToolbar } from "./UnifiedVectorToolbar";

type Props = {
  sessionId: string;
  autoOpenCamera: boolean;
  launchId: string | null;
  items: CaptureItemRecord[];
  activeItemId: string | null;
  modeLabel: string;
  ghostImageUrl: string | null;
  ghostOn: boolean;
  markupOn: boolean;
  onToggleGhost: () => void;
  onToggleMarkup: () => void;
  onMarkupChange: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange: (itemId: string, pins: PhotoAttachmentPin[]) => void;
  onPlanCaptureSaved?: () => void;
  onAddAngle: () => void;
  onAngleCaptureFile: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
  onSelectItem?: (itemId: string) => void;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, ghostOn, markupOn, onToggleGhost, onToggleMarkup, onMarkupChange, onAttachmentPinsChange, onPlanCaptureSaved, onAddAngle, onAngleCaptureFile, onSelectItem }: Props) {
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Stop ready";
  const activeImageUrl = getPhotoAngleImageUrl(activeItem, activeAngleId);
  const activeImageTitle = activeAngleId && activeItem ? `${activeItem.title || "Captured photo"} — angle` : activeItem?.title ?? null;
  const captureReady = Boolean(activeItem || previewActive || activeItemId);
  const ghostAvailable = Boolean(ghostImageUrl);

  useEffect(() => setActiveAngleId(null), [activeItemId]);

  async function handleAngleCaptureFile(itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) {
    const angle = await onAngleCaptureFile(itemId, file, previewUrl, captureMode);
    if (angle) setActiveAngleId(angle.id);
    return angle;
  }

  function dispatchCanvasEvent(type: string) {
    window.dispatchEvent(new CustomEvent(type));
  }

  function handleTapDismiss(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) activeElement.blur();
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0B0F15] text-white" onPointerDownCapture={handleTapDismiss}>
      {/* TopCaptureBar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/80 px-3 py-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-xl">
        <button type="button" onClick={() => setExitConfirm(true)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 text-[10px] font-black text-red-300 hover:bg-red-500/20" aria-label="Exit walk">
          <LogOut className="h-3.5 w-3.5" /> Exit Walk
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{activeLocation}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">{modeLabel || "Camera"}</p>
        </div>
      </header>

      {/* Exit confirmation modal */}
      {exitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setExitConfirm(false)}>
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900 p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-black text-white">Exit this walk?</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">Your captured items are saved. You can resume this walk later.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setExitConfirm(false)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-black text-white">Cancel</button>
              <Link href="/site-walk" className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-black text-white">Exit Walk</Link>
            </div>
          </div>
        </div>
      )}

      {/* CaptureStage */}
      <div className="absolute top-[env(safe-area-inset-top)] bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-10 overflow-hidden pt-12 pb-[120px]">
        <div className="absolute inset-0 pt-12 pb-[120px]">
          <CameraViewfinder
            sessionId={sessionId}
            autoOpenCamera={autoOpenCamera}
            launchId={launchId}
            layout="visual"
            activeItem={activeItem}
            activeImageUrl={activeImageUrl}
            activeImageTitle={activeImageTitle}
            activeImageKey={`${activeItem?.id ?? "none"}:${activeAngleId ?? "main"}`}
            markupEnabled={markupOn}
            onPlanCaptureSaved={onPlanCaptureSaved}
            onAngleCaptureFile={handleAngleCaptureFile}
            onPreviewStateChange={setPreviewActive}
            onMarkupChange={onMarkupChange}
            onAttachmentPinsChange={onAttachmentPinsChange}
          />
        </div>
        {ghostOn && ghostImageUrl && (
          <img src={ghostImageUrl} alt="Ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />
        )}
      </div>

      {/* Unified Bottom Rail */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col gap-2 border-t border-white/5 bg-slate-950/90 pl-3 pr-[160px] pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur-xl">
        {photoItems.length > 0 && (
          <div ref={timelineRef} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {photoItems.map((pi) => {
              const isActive = pi.id === activeItemId;
              const thumbUrl = pi.local_preview_url || (pi.id ? `/api/site-walk/items/${pi.id}/image` : undefined);
              return (
                <button key={pi.id} type="button" onClick={() => onSelectItem?.(pi.id)} className={`shrink-0 h-10 w-10 rounded-lg overflow-hidden border-2 transition ${isActive ? "border-amber-500 ring-1 ring-amber-500/40" : "border-white/10 opacity-60"}`}>
                  {thumbUrl ? <img src={thumbUrl} alt={pi.title || "Capture"} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-slate-700" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onToggleMarkup} className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black uppercase tracking-wider ${markupOn ? "bg-amber-500 text-slate-950" : "border border-white/10 bg-black/50 text-slate-200"}`}>
            <Shapes className="h-3.5 w-3.5" /> {markupOn ? "Drawing" : "Navigate"}
          </button>
          {markupOn && (
            <>
              <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 text-[10px] font-black uppercase tracking-wider text-slate-200">
                <RotateCcw className="h-3.5 w-3.5" /> Undo
              </button>
              <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 text-[10px] font-black uppercase tracking-wider text-slate-200">
                <RotateCw className="h-3.5 w-3.5" /> Redo
              </button>
            </>
          )}
          <button type="button" onClick={onToggleGhost} disabled={!ghostAvailable} className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 ${ghostOn ? "bg-amber-500 text-slate-950" : "border border-white/10 bg-black/50 text-slate-200"}`}>
            <Ghost className="h-3.5 w-3.5" /> Ghost
          </button>
        </div>
        <div className="pt-1">
          <UnifiedVectorToolbar />
        </div>
      </div>
    </div>
  );
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
