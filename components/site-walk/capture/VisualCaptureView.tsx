"use client";

import Link from "next/link";
import { ArrowLeft, Camera, FileImage } from "lucide-react";
import { useEffect, useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAngleImageUrl, type PhotoAngleCaptureMode, type PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CameraViewfinder } from "./CameraViewfinder";
import { useOptionalCaptureContext } from "./CaptureContext";
import { requestCameraCapture } from "./capture-camera-events";
import { PhotoAngleStrip } from "./PhotoAngleStrip";

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
  onPlanCaptureSaved?: () => void;
  onAddAngle: () => void;
  onAngleCaptureFile: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
};

// Reserve at the bottom for the collapsed CaptureDataBottomSheet handle.
const BOTTOM_SHEET_RESERVE = "5.7rem";

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, ghostOn, markupOn, onMarkupChange, onAttachmentPinsChange, onPlanCaptureSaved, onAddAngle, onAngleCaptureFile }: Props) {
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const captureCtx = useOptionalCaptureContext();
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Stop ready";
  const activeImageUrl = getPhotoAngleImageUrl(activeItem, activeAngleId);
  const activeImageTitle = activeAngleId && activeItem ? `${activeItem.title || "Captured photo"} — angle` : activeItem?.title ?? null;
  const captureReady = Boolean(activeItem || captureCtx?.pendingCapture || previewActive || activeItemId);

  useEffect(() => setActiveAngleId(null), [activeItemId]);

  async function handleAngleCaptureFile(itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) {
    const angle = await onAngleCaptureFile(itemId, file, previewUrl, captureMode);
    if (angle) setActiveAngleId(angle.id);
    return angle;
  }

  function triggerCapture(input: "camera" | "upload") {
    if (captureCtx) captureCtx.requestCapture(input, "next_item");
    else requestCameraCapture(input, "next_item");
  }

  return (
    <div
      className="grid h-full w-full overflow-hidden bg-[#0B0F15] text-white"
      style={{ gridTemplateRows: `auto minmax(0,1fr) auto ${BOTTOM_SHEET_RESERVE}` }}
    >
      {/* Top chrome bar */}
      <header className="z-30 flex items-center gap-2 border-b border-white/5 bg-slate-950/55 px-3 py-2 backdrop-blur-xl">
        <Link href="/site-walk" aria-label="Site Walk Home" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:border-amber-300/50 hover:text-amber-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{activeLocation}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">{modeLabel || "Camera"}</p>
        </div>
        {captureReady && <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">Tools in drawer</p>}
      </header>

      {/* Camera surface */}
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

        <GlassCard className="absolute right-3 top-3 z-20 flex flex-col gap-2 bg-slate-950/55 p-2 backdrop-blur-xl sm:flex-row">
          <button type="button" onClick={() => triggerCapture("camera")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.34)] hover:bg-amber-400">
            <Camera className="h-4 w-4" /> Photo
          </button>
          <button type="button" onClick={() => triggerCapture("upload")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/80 hover:border-amber-300/50 hover:text-amber-100">
            <FileImage className="h-4 w-4" /> Roll
          </button>
        </GlassCard>
      </div>

      {/* Angle strip */}
      <div className="z-20 border-t border-white/5 bg-slate-950/55 px-3 py-2 backdrop-blur-xl">
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
