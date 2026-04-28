"use client";

import { Camera, ChevronLeft, ChevronRight, Paperclip, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import { useState } from "react";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture } from "./capture-camera-events";
import { CameraViewfinder } from "./CameraViewfinder";
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
  onMarkupChange: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange: (itemId: string, pins: PhotoAttachmentPin[]) => void;
  onSelectItem: (item: CaptureItemRecord) => void;
  onNext: () => void;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, ghostImageUrl, onMarkupChange, onAttachmentPinsChange, onSelectItem, onNext }: Props) {
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
      <StopStrip items={photoItems} activeItemId={activeItemId} onSelectItem={onSelectItem} onOpenEdit={onNext} onUndo={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} onRedo={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} />

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} markupEnabled={markupMode} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost overlay" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          {activeItem && <button type="button" onClick={onNext} className="absolute right-2 top-1/2 z-20 flex h-28 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 shadow-xl backdrop-blur-xl" aria-label="Swipe right to notes"><ChevronRight className="h-7 w-7" /></button>}
        </div>
      </main>

      <div className="shrink-0 border-t border-white/10 bg-black/65 px-3 py-2 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMarkupMode((current) => !current)} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black ${markupMode ? "border-blue-500 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/85"}`}>
            {markupMode ? "Markup on" : "Start markup"}
          </button>
        </div>
        {markupMode && <UnifiedVectorToolbar />}
        <div className="mt-2 flex h-20 gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Current stop angles">
          <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 text-[11px] font-black text-white">
            <Plus className="h-5 w-5" /> Angle
          </button>
          {angleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className={`h-16 min-w-16 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-blue-500" : "border-white/15"}`}
              aria-label={`Open ${item.title || "captured angle"}`}
            >
              <PhotoThumb item={item} />
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
    <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/80 px-2 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-start bg-gradient-to-r from-black to-transparent pl-1 text-white/30"><ChevronLeft className="h-4 w-4" /></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-end bg-gradient-to-l from-black to-transparent pr-1 text-white/30"><ChevronRight className="h-4 w-4" /></div>
      <div className="flex h-16 gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" aria-label="Progress timeline">
        <span className="flex h-14 min-w-24 items-center justify-center rounded-2xl border border-blue-500/35 bg-blue-500/15 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">Progress</span>
        <button type="button" onClick={onAdd} className="flex h-14 min-w-24 items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-400/60 bg-blue-500/10 px-3 text-[11px] font-black text-blue-100"><Plus className="h-4 w-4" /> Add</button>
        {items.length > 0 && ghostAvailable && <button type="button" onClick={onToggleGhost} className={`h-14 min-w-24 rounded-2xl border px-3 text-[10px] font-black ${ghostOn ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/70"}`}>Ghost align</button>}
        {items.map((item) => <button key={item.id} type="button" onClick={() => onSelectItem(item)} className="relative h-14 min-w-20 overflow-hidden rounded-2xl border border-white/15 bg-white/10"><PhotoThumb item={item} /><span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-[9px] font-black text-white">{new Date(item.created_at).toLocaleDateString()}</span></button>)}
        <span className="flex h-14 min-w-20 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black text-[10px] font-black text-white/45">Next</span>
      </div>
    </div>
  );
}

function PinnedFileStrip({ pins, onRemove }: { pins: PhotoAttachmentPin[]; onRemove: (pinId: string) => void }) {
  return (
    <div className="mt-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Pinned files on this photo">
      {pins.map((pin) => <span key={pin.id} className="inline-flex max-w-64 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white"><Paperclip className="h-3.5 w-3.5 text-blue-300" /><span className="truncate">{pin.label} · {pin.files.length}</span><button type="button" onClick={() => onRemove(pin.id)} aria-label={`Remove ${pin.label}`}><X className="h-3.5 w-3.5" /></button></span>)}
    </div>
  );
}

function StopStrip({ items, activeItemId, onSelectItem, onOpenEdit, onUndo, onRedo }: { items: CaptureItemRecord[]; activeItemId: string | null; onSelectItem: (item: CaptureItemRecord) => void; onOpenEdit: () => void; onUndo: () => void; onRedo: () => void }) {
  return (
    <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-black px-2 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-start bg-gradient-to-r from-black to-transparent pl-1 text-white/30"><ChevronLeft className="h-4 w-4" /></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-end bg-gradient-to-l from-black to-transparent pr-1 text-white/30"><ChevronRight className="h-4 w-4" /></div>
      <div className="flex h-20 gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" aria-label="Stops in this walk">
        <a href="/site-walk" className="flex h-16 min-w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-xs font-black text-white/90" aria-label="Back"><ChevronLeft className="h-4 w-4" /></a>
        <button type="button" onClick={onUndo} className="flex h-16 min-w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/80" aria-label="Undo markup"><RotateCcw className="h-4 w-4" /></button>
        <button type="button" onClick={onRedo} className="flex h-16 min-w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/80" aria-label="Redo markup"><RotateCw className="h-4 w-4" /></button>
        <span className="flex h-16 min-w-24 items-center justify-center rounded-2xl border border-blue-500/35 bg-blue-500/15 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">Stops</span>
        {items.map((item, index) => (
          <button key={item.id} type="button" onClick={() => onSelectItem(item)} onDoubleClick={() => { onSelectItem(item); onOpenEdit(); }} className={`group relative h-16 min-w-20 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-blue-500 ring-2 ring-blue-500/30" : "border-white/15"}`} aria-label={`Open stop ${item.title || index + 1}`}>
            <PhotoThumb item={item} />
            <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-left text-[10px] font-black leading-tight text-white opacity-90 transition group-hover:opacity-100">{item.title || `Stop ${index + 1}`}</span>
          </button>
        ))}
        <span className="flex h-16 min-w-20 items-center justify-center rounded-2xl border border-dashed border-white/25 bg-black text-[10px] font-black text-white/45">Next stop</span>
      </div>
    </div>
  );
}

function dispatchCanvasEvent(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

function getPhotoThumbUrl(item: CaptureItemRecord) {
  if (item.local_preview_url) return item.local_preview_url;
  return item.id.startsWith("item-") ? null : `/api/site-walk/items/${encodeURIComponent(item.id)}/image`;
}

function PhotoThumb({ item }: { item: CaptureItemRecord }) {
  const thumbUrl = getPhotoThumbUrl(item);
  return thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-black"><Camera className="h-5 w-5 text-white/45" /></span>;
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
