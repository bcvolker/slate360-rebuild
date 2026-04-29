"use client";

import { Camera, ChevronLeft, ChevronRight, MapPin, Paperclip, Plus, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
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

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, onMarkupChange, onAttachmentPinsChange, onSelectItem, onNext }: Props) {
  const [ghostOn, setGhostOn] = useState(false);
  const [markupMode, setMarkupMode] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Current location";
  const angleItems = photoItems.filter((item) => getLocationLabel(item) === activeLocation);
  const progressItems = angleItems.filter((item) => item.id !== activeItemId);
  const activePins = getPhotoAttachmentPins(activeItem?.metadata);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      <TopCaptureControls modeLabel={modeLabel} activeLocation={activeLocation} onUndo={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} onRedo={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} />
      <StopCarousel items={photoItems} activeItemId={activeItemId} onSelectItem={onSelectItem} onOpenEdit={onNext} />

      <main className="min-h-0 flex-1 border-y border-white/10 bg-zinc-950">
        <div className="flex h-full min-h-0">
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} markupEnabled={markupMode} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
            {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          </div>
          <button type="button" onClick={onNext} className="flex w-10 shrink-0 items-center justify-center border-l border-white/10 bg-black text-white/80" aria-label="Open notes and details">
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </main>

      <CaptureActionBar pinCount={activePins.length} markupMode={markupMode} onToggleMarkup={() => setMarkupMode((current) => !current)} onOpenAttachments={() => setAttachmentsOpen(true)} onAddAngle={() => requestCameraCapture("camera", "next_item")} />
      {markupMode && <div className="shrink-0 border-b border-white/10 bg-black px-2 py-1"><UnifiedVectorToolbar /></div>}
      <AngleCarousel items={angleItems.length > 0 ? angleItems : photoItems} activeItemId={activeItemId} onSelectItem={onSelectItem} />
      <ProgressTimeline items={progressItems} ghostOn={ghostOn} ghostAvailable={!!ghostImageUrl} onToggleGhost={() => setGhostOn((current) => !current)} onAdd={() => { setGhostOn(true); requestCameraCapture("camera", "next_item"); }} onSelectItem={onSelectItem} />

      {attachmentsOpen && (
        <AttachmentsSheet
          pins={activePins}
          onClose={() => setAttachmentsOpen(false)}
          onRemove={(pinId) => activeItem && onAttachmentPinsChange(activeItem.id, activePins.filter((pin) => pin.id !== pinId))}
        />
      )}
    </div>
  );
}

function TopCaptureControls({ modeLabel, activeLocation, onUndo, onRedo }: { modeLabel: string; activeLocation: string; onUndo: () => void; onRedo: () => void }) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-black px-2 py-2">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <a href="/site-walk" className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/85"><ChevronLeft className="h-4 w-4" /> Back</a>
        <button type="button" className="h-9 min-w-0 rounded-xl border border-blue-500/35 bg-blue-500/15 px-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
          <span className="block truncate">{modeLabel || "Field Punch"}</span>
          <span className="block text-[9px] text-blue-100/70">Stops</span>
        </button>
        <button type="button" className="inline-flex h-9 max-w-28 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-[10px] font-black text-white/85"><MapPin className="h-3.5 w-3.5 text-blue-300" /><span className="truncate">{activeLocation}</span></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={onUndo} className="h-8 rounded-xl border border-white/15 bg-white/5 text-[10px] font-black text-white/75"><RotateCcw className="mx-auto h-4 w-4" /></button>
        <button type="button" onClick={onRedo} className="h-8 rounded-xl border border-white/15 bg-white/5 text-[10px] font-black text-white/75"><RotateCw className="mx-auto h-4 w-4" /></button>
      </div>
    </header>
  );
}

function StopCarousel({ items, activeItemId, onSelectItem, onOpenEdit }: { items: CaptureItemRecord[]; activeItemId: string | null; onSelectItem: (item: CaptureItemRecord) => void; onOpenEdit: () => void }) {
  return (
    <section className="shrink-0 bg-black px-2 py-2" aria-label="Locations and stops">
      <div className="flex h-16 gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black p-1 no-scrollbar">
        <span className="flex min-w-24 flex-col justify-center rounded-xl border border-white/15 bg-white px-3 text-slate-950"><span className="text-[9px] font-black uppercase text-rose-500">Last</span><span className="truncate text-[11px] font-black">Location</span></span>
        <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex min-w-16 items-center justify-center rounded-xl border border-blue-400/60 bg-blue-500/15 text-blue-100" aria-label="Add stop"><Plus className="h-7 w-7" /></button>
        {items.map((item, index) => <ThumbButton key={item.id} item={item} active={item.id === activeItemId} label={item.title || `Stop ${index + 1}`} onClick={() => onSelectItem(item)} onDoubleClick={() => { onSelectItem(item); onOpenEdit(); }} />)}
        <span className="flex min-w-20 items-center justify-center rounded-xl border border-dashed border-white/20 text-[10px] font-black text-white/45">Next</span>
      </div>
    </section>
  );
}

function CaptureActionBar({ pinCount, markupMode, onToggleMarkup, onOpenAttachments, onAddAngle }: { pinCount: number; markupMode: boolean; onToggleMarkup: () => void; onOpenAttachments: () => void; onAddAngle: () => void }) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-black px-2 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <button type="button" onClick={onToggleMarkup} className={`h-10 rounded-xl border px-2 text-[10px] font-black uppercase tracking-[0.1em] ${markupMode ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/80"}`}>Markup</button>
        <button type="button" onClick={onAddAngle} className="flex h-10 w-16 items-center justify-center rounded-xl border border-blue-400/60 bg-blue-500/15 text-blue-100" aria-label="Add angle"><Plus className="h-7 w-7" /></button>
        <button type="button" onClick={onOpenAttachments} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-[10px] font-black text-white/80"><Paperclip className="h-4 w-4 text-blue-300" /> Files ({pinCount})</button>
      </div>
    </div>
  );
}

function AngleCarousel({ items, activeItemId, onSelectItem }: { items: CaptureItemRecord[]; activeItemId: string | null; onSelectItem: (item: CaptureItemRecord) => void }) {
  return (
    <section className="shrink-0 bg-black px-2 py-2" aria-label="Angles">
      <div className="flex h-16 gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black p-1 no-scrollbar">
        <span className="flex min-w-20 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-white">Angle</span>
        <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex min-w-16 items-center justify-center rounded-xl border border-blue-400/60 bg-blue-500/15 text-blue-100" aria-label="Add angle"><Plus className="h-7 w-7" /></button>
        {items.map((item) => <ThumbButton key={item.id} item={item} active={item.id === activeItemId} label={item.title || "Angle"} onClick={() => onSelectItem(item)} />)}
        <span className="flex min-w-20 items-center justify-center rounded-xl border border-dashed border-white/20 text-[10px] font-black text-white/45">Next</span>
      </div>
    </section>
  );
}

function ProgressTimeline({ items, ghostOn, ghostAvailable, onToggleGhost, onAdd, onSelectItem }: { items: CaptureItemRecord[]; ghostOn: boolean; ghostAvailable: boolean; onToggleGhost: () => void; onAdd: () => void; onSelectItem: (item: CaptureItemRecord) => void }) {
  return (
    <section className="shrink-0 bg-black px-2 pb-2" aria-label="Progress">
      <div className="flex h-14 gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black p-1 no-scrollbar">
        <span className="flex min-w-24 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-white">Progress</span>
        <button type="button" onClick={onAdd} className="flex min-w-20 items-center justify-center gap-1 rounded-xl border border-blue-400/60 bg-blue-500/15 text-[10px] font-black text-blue-100"><Plus className="h-4 w-4" /> Add</button>
        {ghostAvailable && <button type="button" onClick={onToggleGhost} className={`min-w-24 rounded-xl border px-2 text-[10px] font-black ${ghostOn ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/70"}`}>Ghost align</button>}
        {items.map((item) => <ThumbButton key={item.id} item={item} active={false} label={new Date(item.created_at).toLocaleDateString()} onClick={() => onSelectItem(item)} />)}
        <span className="flex min-w-20 items-center justify-center rounded-xl border border-dashed border-white/20 text-[10px] font-black text-white/45">Next</span>
      </div>
    </section>
  );
}

function AttachmentsSheet({ pins, onClose, onRemove }: { pins: PhotoAttachmentPin[]; onClose: () => void; onRemove: (pinId: string) => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/55" role="dialog" aria-label="Pinned attachments" onClick={onClose}>
      <div className="rounded-t-3xl border-t border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-100">Pinned attachments ({pins.length})</p><button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white/80" aria-label="Close attachments"><X className="h-4 w-4" /></button></div>
        {pins.length === 0 ? <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs font-bold text-white/60">Long-press the photo to drop a pin and attach files.</p> : <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 no-scrollbar">{pins.map((pin) => <li key={pin.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"><Paperclip className="h-4 w-4 shrink-0 text-blue-300" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{pin.label}</p><p className="truncate text-[11px] font-bold text-white/60">{pin.files.length} file{pin.files.length === 1 ? "" : "s"}{pin.note ? ` · ${pin.note}` : ""}</p></div><button type="button" onClick={() => onRemove(pin.id)} className="rounded-full border border-white/15 p-2 text-white/75 hover:border-rose-400 hover:text-rose-200" aria-label={`Remove ${pin.label}`}><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
      </div>
    </div>
  );
}

function ThumbButton({ item, active, label, onClick, onDoubleClick }: { item: CaptureItemRecord; active: boolean; label: string; onClick: () => void; onDoubleClick?: () => void }) {
  return <button type="button" onClick={onClick} onDoubleClick={onDoubleClick} className={`relative min-w-20 overflow-hidden rounded-xl border ${active ? "border-blue-500 ring-2 ring-blue-500/30" : "border-white/15"}`} aria-label={`Open ${label}`}><PhotoThumb item={item} /><span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-left text-[9px] font-black text-white">{label}</span></button>;
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
  return thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-zinc-950"><Camera className="h-5 w-5 text-white/45" /></span>;
}

function getLocationLabel(item: CaptureItemRecord | null) {
  if (!item) return null;
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || null;
}
