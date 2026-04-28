"use client";

import { Camera, ChevronLeft, ChevronRight, History, Paperclip, Plus, X } from "lucide-react";
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
  const [markupMode, setMarkupMode] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem);
  const angleItems = activeLocation ? photoItems.filter((item) => getLocationLabel(item) === activeLocation) : photoItems;
  const timelineItems = angleItems.filter((item) => item.id !== activeItemId);
  const activePins = getPhotoAttachmentPins(activeItem?.metadata);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 backdrop-blur-xl">
        <a href="/site-walk" className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-black text-white/90">
          <ChevronLeft className="h-4 w-4" /> Back
        </a>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-[#D4AF37]">Location stops</p>
          <p className="text-[11px] font-bold text-white/55">{modeLabel} · pinch/zoom until markup starts</p>
        </div>
        <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#D4AF37] px-3 text-xs font-black text-zinc-950 shadow-lg shadow-[#D4AF37]/20">
          Notes <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <StopStrip items={photoItems} activeItemId={activeItemId} onSelectItem={onSelectItem} onOpenEdit={onNext} />

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} markupEnabled={markupMode} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost overlay" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          {activeItem && <button type="button" onClick={onNext} className="absolute right-2 top-1/2 z-20 flex h-28 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 shadow-xl backdrop-blur-xl" aria-label="Swipe right to notes"><ChevronRight className="h-7 w-7" /></button>}
        </div>
      </main>

      <div className="shrink-0 border-t border-white/10 bg-black/65 px-3 py-2 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMarkupMode((current) => !current)} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black ${markupMode ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#F8E7A1]" : "border-white/15 bg-white/10 text-white/85"}`}>
            {markupMode ? "Markup on" : "Start markup"}
          </button>
          <span className="text-[11px] font-bold text-white/50">Pinch/zoom first. Markup only when enabled.</span>
        </div>
        {markupMode ? <UnifiedVectorToolbar /> : <p className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">Markup tools are paused so pinch/zoom and pan work normally. Tap Start markup when ready.</p>}
        <div className="mt-2 flex h-20 gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Current stop angles">
          <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 text-[11px] font-black text-white">
            <Plus className="h-5 w-5" /> Angle
          </button>
          {angleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className={`h-16 min-w-16 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-[#D4AF37]" : "border-white/15"}`}
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
        {activeItem && <ProgressTimeline items={timelineItems} ghostOn={ghostOn} onToggleGhost={() => setGhostOn((current) => !current)} onAdd={() => { setGhostOn(true); requestCameraCapture("camera", "next_item"); }} onSelectItem={onSelectItem} ghostAvailable={!!ghostImageUrl} />}
        {activeItem && activePins.length > 0 && <PinnedFileStrip pins={activePins} onRemove={(pinId) => onAttachmentPinsChange(activeItem.id, activePins.filter((pin) => pin.id !== pinId))} />}
      </div>
    </div>
  );
}

function ProgressTimeline({ items, ghostOn, ghostAvailable, onToggleGhost, onAdd, onSelectItem }: { items: CaptureItemRecord[]; ghostOn: boolean; ghostAvailable: boolean; onToggleGhost: () => void; onAdd: () => void; onSelectItem: (item: CaptureItemRecord) => void }) {
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#D4AF37]"><History className="h-3.5 w-3.5" /> Progress timeline</p>
        <button type="button" onClick={onToggleGhost} disabled={!ghostAvailable} className={`rounded-full border px-2 py-1 text-[10px] font-black ${ghostOn ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#F8E7A1]" : "border-white/15 bg-white/10 text-white/70 disabled:opacity-40"}`}>Ghost align</button>
      </div>
      <div className="flex h-16 gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button type="button" onClick={onAdd} className="flex h-14 min-w-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 text-[11px] font-black text-[#F8E7A1]"><Plus className="h-4 w-4" /> Add progress</button>
        {items.map((item) => <button key={item.id} type="button" onClick={() => onSelectItem(item)} className="relative h-14 min-w-20 overflow-hidden rounded-2xl border border-white/15 bg-white/10">{item.local_preview_url ? <img src={item.local_preview_url} alt="" className="h-full w-full object-cover" /> : <Camera className="m-auto h-full w-5 text-white/60" />}<span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-[9px] font-black text-white">{new Date(item.created_at).toLocaleDateString()}</span></button>)}
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
          <button key={item.id} type="button" onClick={() => onSelectItem(item)} onDoubleClick={() => { onSelectItem(item); onOpenEdit(); }} className={`group relative h-16 min-w-20 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30" : "border-white/15"}`} aria-label={`Open stop ${item.title || index + 1}`}>
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
