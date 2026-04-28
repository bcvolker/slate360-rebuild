"use client";

import { Camera, ChevronRight, Ghost, LogOut, Paperclip, Plus, X } from "lucide-react";
import { useState } from "react";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture } from "./capture-camera-events";
import { CameraViewfinder } from "./CameraViewfinder";
import { UnifiedVectorToolbar } from "./UnifiedVectorToolbar";

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
  onSelectItem: (item: CaptureItemRecord) => void;
  onNext: () => void;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, onMarkupChange, onAttachmentPinsChange, onSelectItem, onNext }: Props) {
  const [ghostOn, setGhostOn] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem);
  const angleItems = activeLocation ? photoItems.filter((item) => getLocationLabel(item) === activeLocation) : photoItems;
  const activePins = getPhotoAttachmentPins(activeItem?.metadata);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 backdrop-blur-xl">
        <a href="/site-walk" className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-black text-white/90">
          <LogOut className="h-4 w-4" /> End
        </a>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-emerald-200">{modeLabel}</p>
          <p className="text-[11px] font-bold text-white/55">photo → markup → swipe notes</p>
        </div>
        <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-400 px-3 text-xs font-black text-zinc-950 shadow-lg shadow-emerald-400/20">
          Notes <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <StopStrip items={photoItems} activeItemId={activeItemId} onSelectItem={onSelectItem} onOpenEdit={onNext} />

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost overlay" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
        </div>
      </main>

      <div className="shrink-0 border-t border-white/10 bg-black/65 px-3 py-2 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setGhostOn((current) => !current)} disabled={!ghostImageUrl} className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-black ${ghostOn ? "border-emerald-300 bg-emerald-400/20 text-emerald-100" : "border-white/15 bg-white/10 text-white/80 disabled:opacity-40"}`}>
          <Ghost className="h-4 w-4" /> Ghost Overlay
          </button>
          <button type="button" onClick={onNext} className="inline-flex h-8 items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 text-xs font-black text-emerald-100">Swipe right for notes <ChevronRight className="h-4 w-4" /></button>
        </div>
        <UnifiedVectorToolbar />
        <div className="mt-2 flex h-20 gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Current stop angles">
          <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 text-[11px] font-black text-white">
            <Plus className="h-5 w-5" /> Angle
          </button>
          {angleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className={`h-16 min-w-16 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-emerald-300" : "border-white/15"}`}
              aria-label={`Open ${item.title || "captured angle"}`}
            >
              {item.local_preview_url ? (
                <img src={item.local_preview_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/10"><Camera className="h-5 w-5" /></span>
              )}
            </button>
          ))}
        </div>
        {activeItem && activePins.length > 0 && <PinnedFileStrip pins={activePins} onRemove={(pinId) => onAttachmentPinsChange(activeItem.id, activePins.filter((pin) => pin.id !== pinId))} />}
      </div>
    </div>
  );
}

function PinnedFileStrip({ pins, onRemove }: { pins: PhotoAttachmentPin[]; onRemove: (pinId: string) => void }) {
  return (
    <div className="mt-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Pinned files on this photo">
      {pins.map((pin) => <span key={pin.id} className="inline-flex max-w-64 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white"><Paperclip className="h-3.5 w-3.5 text-amber-200" /><span className="truncate">{pin.label} · {pin.files.length}</span><button type="button" onClick={() => onRemove(pin.id)} aria-label={`Remove ${pin.label}`}><X className="h-3.5 w-3.5" /></button></span>)}
    </div>
  );
}

function StopStrip({ items, activeItemId, onSelectItem, onOpenEdit }: { items: CaptureItemRecord[]; activeItemId: string | null; onSelectItem: (item: CaptureItemRecord) => void; onOpenEdit: () => void }) {
  if (items.length === 0) return null;
  return (
    <div className="shrink-0 border-b border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl">
      <div className="flex h-20 gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Stops in this walk">
        {items.map((item, index) => (
          <button key={item.id} type="button" onClick={() => onSelectItem(item)} onDoubleClick={() => { onSelectItem(item); onOpenEdit(); }} className={`group relative h-16 min-w-20 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-amber-300 ring-2 ring-amber-300/30" : "border-white/15"}`} aria-label={`Open stop ${item.title || index + 1}`}>
            {item.local_preview_url ? <img src={item.local_preview_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-white/10"><Camera className="h-5 w-5" /></span>}
            <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-left text-[10px] font-black leading-tight text-white opacity-90 transition group-hover:opacity-100">{item.title || `Stop ${index + 1}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
