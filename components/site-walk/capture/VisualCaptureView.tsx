"use client";

import Link from "next/link";
import { ArrowLeft, Camera, FileImage, Ghost, RotateCcw, RotateCw, Shapes } from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture } from "./capture-camera-events";
import { CameraViewfinder } from "./CameraViewfinder";
import { PHOTO_MARKUP_REDO_EVENT, PHOTO_MARKUP_UNDO_EVENT } from "./PhotoMarkupCanvas";

type Props = {
  sessionId: string;
  autoOpenCamera: boolean;
  launchId: string | null;
  items: CaptureItemRecord[];
  activeItemId: string | null;
  modeLabel: string;
  ghostImageUrl: string | null;
  onMarkupChange: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange: (itemId: string, pins: PhotoAttachmentPin[]) => void;
  onPlanCaptureSaved?: () => void;
  onSelectItem: (item: CaptureItemRecord) => void;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, onMarkupChange, onAttachmentPinsChange, onPlanCaptureSaved, onSelectItem }: Props) {
  const [ghostOn, setGhostOn] = useState(false);
  const [markupOn, setMarkupOn] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Stop ready";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0B0F15] text-white">
      {/* Layer 0: full-bleed camera */}
      <div className="absolute inset-0 z-0">
        <CameraViewfinder
          sessionId={sessionId}
          autoOpenCamera={autoOpenCamera}
          launchId={launchId}
          layout="visual"
          activeItem={activeItem}
          markupEnabled={markupOn}
          onPlanCaptureSaved={onPlanCaptureSaved}
          onMarkupChange={onMarkupChange}
          onAttachmentPinsChange={onAttachmentPinsChange}
        />
      </div>

      {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost alignment" className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover opacity-25 mix-blend-screen" />}

      {/* Layer 1: floating transparent tools */}
      <GlassCard className="absolute left-3 top-3 z-20 flex max-w-[58vw] items-center gap-3 bg-slate-950/55 px-3 py-2 backdrop-blur-xl">
        <Link href="/site-walk" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:border-amber-300/50 hover:text-amber-100" aria-label="Site Walk Home">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{activeLocation}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">{modeLabel || "Camera"}</p>
        </div>
      </GlassCard>

      <GlassCard className="absolute right-3 top-3 z-20 flex items-center gap-1 bg-slate-950/55 p-1.5 backdrop-blur-xl">
        <button type="button" onClick={() => setGhostOn((current) => !current)} disabled={!ghostImageUrl} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[11px] font-black uppercase tracking-[0.1em] transition disabled:opacity-40 ${ghostOn ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-white/75 hover:text-amber-100"}`}>
          <Ghost className="h-4 w-4" /> Ghost Mode
        </button>
        <button type="button" onClick={() => setMarkupOn((current) => !current)} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${markupOn ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-white/75 hover:text-amber-100"}`} aria-label="Toggle markup tools">
          <Shapes className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/70 hover:text-amber-100" aria-label="Undo markup">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/70 hover:text-amber-100" aria-label="Redo markup">
          <RotateCw className="h-4 w-4" />
        </button>
      </GlassCard>

      <GlassCard className="absolute left-3 bottom-28 z-20 flex gap-2 bg-slate-950/55 p-2 backdrop-blur-xl">
        <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(245,158,11,0.34)] hover:bg-amber-400">
          <Camera className="h-5 w-5" /> Photo
        </button>
        <button type="button" onClick={() => requestCameraCapture("upload", "next_item")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/80 hover:border-amber-300/50 hover:text-amber-100">
          <FileImage className="h-5 w-5" /> Roll
        </button>
      </GlassCard>

      {photoItems.length > 0 && (
        <div className="absolute inset-x-3 bottom-[11.2rem] z-20 flex gap-2 overflow-x-auto no-scrollbar">
          {photoItems.slice(0, 12).map((item) => (
            <button key={item.id} type="button" onClick={() => onSelectItem(item)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-2xl border bg-black/50 ${item.id === activeItemId ? "border-amber-400 ring-2 ring-amber-500/30" : "border-white/15"}`} aria-label={`Open ${item.title}`}>
              <PhotoThumb item={item} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ item }: { item: CaptureItemRecord }) {
  const thumbUrl = getCaptureImageUrl(item);
  return thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-zinc-950"><Camera className="h-5 w-5 text-white/45" /></span>;
}

function dispatchCanvasEvent(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}