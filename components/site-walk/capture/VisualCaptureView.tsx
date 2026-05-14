"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { useEffect, useState, type PointerEvent } from "react";

import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAngleImageUrl, type PhotoAngleCaptureMode, type PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { SiteWalkPin } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CameraViewfinder } from "./CameraViewfinder";

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
  onMarkupChange: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange: (itemId: string, pins: PhotoAttachmentPin[]) => void;
  onPlanCaptureSaved?: (pin: SiteWalkPin | null) => void;
  onAngleCaptureFile: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
  onBackToPlan?: () => void;
  showTaskHeader?: boolean;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, ghostOn, markupOn, onMarkupChange, onAttachmentPinsChange, onPlanCaptureSaved, onAngleCaptureFile, onBackToPlan, showTaskHeader = true }: Props) {
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [, setPreviewActive] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Stop ready";
  const activeImageUrl = getPhotoAngleImageUrl(activeItem, activeAngleId);
  const activeImageTitle = activeAngleId && activeItem ? `${activeItem.title || "Captured photo"} — angle` : activeItem?.title ?? null;

  useEffect(() => setActiveAngleId(null), [activeItemId]);

  async function handleAngleCaptureFile(itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) {
    const angle = await onAngleCaptureFile(itemId, file, previewUrl, captureMode);
    if (angle) setActiveAngleId(angle.id);
    return angle;
  }

  function handleTapDismiss(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) activeElement.blur();
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F15] text-white" onPointerDownCapture={handleTapDismiss}>
      {/* TopCaptureBar */}
      {showTaskHeader && <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/88 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-xl">
        {onBackToPlan && (
          <button type="button" onClick={onBackToPlan} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-lg shadow-amber-500/20" aria-label="Back to plan">
            <ArrowLeft className="h-4 w-4" /> Plan
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{activeLocation}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">{modeLabel || "Camera"}</p>
        </div>
        <button type="button" onClick={() => setExitConfirm(true)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-red-500/25 bg-black/25 px-2.5 text-[10px] font-black text-red-200/85 hover:bg-red-500/15" aria-label="Exit walk">
          <LogOut className="h-3.5 w-3.5" /> Exit
        </button>
      </header>}

      {/* Exit confirmation modal */}
      {showTaskHeader && exitConfirm && (
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
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
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
          <img src={ghostImageUrl} alt="Ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />
        )}
      </div>
    </div>
  );
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
