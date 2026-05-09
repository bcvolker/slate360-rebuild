"use client";

import Link from "next/link";
import { ArrowLeft, Ghost, RotateCcw, RotateCw, Shapes } from "lucide-react";
import { useEffect, useState, type PointerEvent } from "react";
import { useVirtualKeyboardOffset } from "@/lib/hooks/useVirtualKeyboardOffset";
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
};

// Reserve at the bottom for the collapsed CaptureDataBottomSheet handle.
const BOTTOM_SHEET_RESERVE = "5.7rem";

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, ghostOn, markupOn, onToggleGhost, onToggleMarkup, onMarkupChange, onAttachmentPinsChange, onPlanCaptureSaved, onAddAngle, onAngleCaptureFile }: Props) {
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const keyboardOffset = useVirtualKeyboardOffset();
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

  const bottomReserve = keyboardOffset > 0 ? `calc(${BOTTOM_SHEET_RESERVE} + ${keyboardOffset}px)` : BOTTOM_SHEET_RESERVE;

  return (
    <div
      className="grid h-full w-full overflow-hidden bg-[#0B0F15] text-white"
      style={{ gridTemplateRows: `auto minmax(0,1fr) auto ${bottomReserve}` }}
      onPointerDownCapture={handleTapDismiss}
    >
      {/* Top chrome bar */}
      <header className="z-30 flex items-center gap-2 border-b border-white/5 bg-slate-950/55 px-3 py-1.5 backdrop-blur-xl">
        <Link href="/site-walk" aria-label="Site Walk Home" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:border-amber-300/50 hover:text-amber-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{activeLocation}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">{modeLabel || "Camera"}</p>
        </div>
      </header>

      {/* Camera surface — with tools overlaid at the bottom */}
      <div className="relative min-h-0">
        <div className="absolute inset-0">
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
          <img src={ghostImageUrl} alt="Previous progress ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />
        )}

        {/* Tools overlay — pinned at bottom of camera surface, always visible above bottom sheet */}
        {captureReady && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-transparent px-3 pb-2 pt-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button type="button" onClick={onToggleMarkup} className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${markupOn ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "border border-white/10 bg-black/50 text-slate-200"}`}>
                <Shapes className="h-3.5 w-3.5" /> {markupOn ? "Drawing" : "Navigate"}
              </button>
              <button type="button" onClick={onToggleGhost} disabled={!ghostAvailable} className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-40 ${ghostOn ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "border border-white/10 bg-black/50 text-slate-200"}`}>
                <Ghost className="h-3.5 w-3.5" /> Ghost
              </button>
              {markupOn && (
                <>
                  <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-200">
                    <RotateCcw className="h-3.5 w-3.5" /> Undo
                  </button>
                  <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-200">
                    <RotateCw className="h-3.5 w-3.5" /> Redo
                  </button>
                </>
              )}
            </div>
            {markupOn && <UnifiedVectorToolbar />}
          </div>
        )}
      </div>

      {/* Angle strip */}
      <div className="z-20 border-t border-white/5 bg-slate-950/55 px-3 py-1.5 backdrop-blur-xl">
        <PhotoAngleStrip item={activeItem} activeAngleId={activeAngleId} className="static left-auto right-auto bottom-auto" onSelectAngle={setActiveAngleId} onAddAngle={onAddAngle} />
      </div>

      {/* Reserved space for collapsed CaptureDataBottomSheet handle */}
      <div aria-hidden />
    </div>
  );
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
