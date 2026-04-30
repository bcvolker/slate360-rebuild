"use client";

import { Camera, ChevronLeft, ChevronRight, Eye, ExternalLink, Loader2, Paperclip, Plus, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getPhotoAttachmentPins, type PhotoAttachmentFile, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
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
  const [railMode, setRailMode] = useState<"angles" | "progress">("angles");
  const [revealedThumbKey, setRevealedThumbKey] = useState<string | null>(null);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Current location";
  const angleItems = photoItems.filter((item) => getLocationLabel(item) === activeLocation);
  const progressItems = angleItems.filter((item) => item.id !== activeItemId);
  const activePins = getPhotoAttachmentPins(activeItem?.metadata);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white">
      <TopCaptureControls modeLabel={modeLabel} onNext={onNext} onUndo={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} onRedo={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} />
      <StopCarousel items={photoItems} activeItemId={activeItemId} revealedThumbKey={revealedThumbKey} onReveal={setRevealedThumbKey} onSelectItem={onSelectItem} onOpenEdit={onNext} />

      <main className="min-h-0 flex-1 border-y border-cyan-300/10 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.16),rgba(2,6,23,0.96)_55%)]">
        <div className="relative h-full min-h-0 overflow-hidden">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} markupEnabled={markupMode} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          <button type="button" onClick={onNext} className="absolute bottom-3 right-3 z-20 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-cyan-200/35 bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.25)]" aria-label="Add details for this photo">
            Add Details <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </main>

      <CaptureActionBar pinCount={activePins.length} markupMode={markupMode} onToggleMarkup={() => setMarkupMode((current) => !current)} onOpenAttachments={() => setAttachmentsOpen(true)} />
      {markupMode && <div className="shrink-0 border-b border-white/10 bg-black px-2 py-1"><UnifiedVectorToolbar /></div>}
      <CaptureMediaRail mode={railMode} onModeChange={setRailMode} angleItems={angleItems.length > 0 ? angleItems : photoItems} progressItems={progressItems} activeItemId={activeItemId} ghostOn={ghostOn} ghostAvailable={!!ghostImageUrl} revealedThumbKey={revealedThumbKey} onReveal={setRevealedThumbKey} onToggleGhost={() => setGhostOn((current) => !current)} onAddProgress={() => { setRailMode("progress"); setGhostOn(true); requestCameraCapture("camera", "next_item"); }} onSelectItem={onSelectItem} />

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

function TopCaptureControls({ modeLabel, onNext, onUndo, onRedo }: { modeLabel: string; onNext: () => void; onUndo: () => void; onRedo: () => void }) {
  return (
    <header className="shrink-0 border-b border-cyan-300/10 bg-slate-950/95 px-2 py-2 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <a href="/site-walk" className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/85"><ChevronLeft className="h-4 w-4" /> Back</a>
        <label className="min-w-0">
          <span className="sr-only">Walk project mode</span>
          <select defaultValue={modeLabel || "Photos-only"} className="h-9 w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-2 text-center text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
            <option>Photos-only</option>
            <option>Attach to field project</option>
            <option>Field project</option>
          </select>
        </label>
        <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-1 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">Details <ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={onUndo} className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-[0.1em] text-white/75"><RotateCcw className="h-4 w-4" /> Undo</button>
        <button type="button" onClick={onRedo} className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-[0.1em] text-white/75">Redo <RotateCw className="h-4 w-4" /></button>
      </div>
    </header>
  );
}

function StopCarousel({ items, activeItemId, revealedThumbKey, onReveal, onSelectItem, onOpenEdit }: { items: CaptureItemRecord[]; activeItemId: string | null; revealedThumbKey: string | null; onReveal: (key: string) => void; onSelectItem: (item: CaptureItemRecord) => void; onOpenEdit: () => void }) {
  return (
    <section className="shrink-0 bg-transparent py-1" aria-label="Locations and stops">
      <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Last location / stops</p>
      <RailShell heightClass="h-16">
        {items.map((item, index) => <ThumbButton key={item.id} item={item} thumbKey={`stop-${item.id}`} active={item.id === activeItemId} revealed={revealedThumbKey === `stop-${item.id}`} label={item.title || `Stop ${index + 1}`} onReveal={onReveal} onOpen={() => onSelectItem(item)} onDoubleClick={() => { onSelectItem(item); onOpenEdit(); }} />)}
        <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex aspect-square h-full shrink-0 items-center justify-center border border-blue-400/70 bg-blue-500/15 text-blue-100" aria-label="Add stop"><Plus className="h-6 w-6" /></button>
      </RailShell>
    </section>
  );
}

function CaptureActionBar({ pinCount, markupMode, onToggleMarkup, onOpenAttachments }: { pinCount: number; markupMode: boolean; onToggleMarkup: () => void; onOpenAttachments: () => void }) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-black px-2 py-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onToggleMarkup} className={`h-10 rounded-xl border px-2 text-[10px] font-black uppercase tracking-[0.1em] ${markupMode ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/80"}`}>Markup</button>
        <button type="button" onClick={onOpenAttachments} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-[10px] font-black text-white/80"><Paperclip className="h-4 w-4 text-blue-300" /> Attached ({pinCount})</button>
      </div>
    </div>
  );
}

function CaptureMediaRail({ mode, onModeChange, angleItems, progressItems, activeItemId, ghostOn, ghostAvailable, revealedThumbKey, onReveal, onToggleGhost, onAddProgress, onSelectItem }: { mode: "angles" | "progress"; onModeChange: (mode: "angles" | "progress") => void; angleItems: CaptureItemRecord[]; progressItems: CaptureItemRecord[]; activeItemId: string | null; ghostOn: boolean; ghostAvailable: boolean; revealedThumbKey: string | null; onReveal: (key: string) => void; onToggleGhost: () => void; onAddProgress: () => void; onSelectItem: (item: CaptureItemRecord) => void }) {
  const showingProgress = mode === "progress";
  const items = showingProgress ? progressItems : angleItems;
  return (
    <section className="shrink-0 bg-transparent pt-1 pb-[calc(0.55rem+env(safe-area-inset-bottom))]" aria-label="Capture media rail">
      <div className="mx-3 mb-1 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button type="button" onClick={() => onModeChange("angles")} className={`h-8 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] ${!showingProgress ? "bg-cyan-300 text-slate-950" : "text-white/65"}`}>Additional Angles</button>
        <button type="button" onClick={() => onModeChange("progress")} className={`h-8 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] ${showingProgress ? "bg-cyan-300 text-slate-950" : "text-white/65"}`}>Progress / Before &amp; After</button>
      </div>
      <RailShell heightClass="h-14">
        <button type="button" onClick={showingProgress ? onAddProgress : () => requestCameraCapture("camera", "next_item")} className="flex aspect-square h-full shrink-0 items-center justify-center border border-cyan-300/60 bg-cyan-300/15 text-cyan-100" aria-label={showingProgress ? "Add progress photo" : "Add angle"}><Plus className="h-5 w-5" /></button>
        {showingProgress && ghostAvailable && <button type="button" onClick={onToggleGhost} className={`min-w-24 border px-2 text-[10px] font-black ${ghostOn ? "border-cyan-300 bg-cyan-300/20 text-cyan-100" : "border-white/15 bg-white/10 text-white/70"}`}>Ghost align</button>}
        {items.map((item) => <ThumbButton key={item.id} item={item} thumbKey={`${mode}-${item.id}`} active={!showingProgress && item.id === activeItemId} revealed={revealedThumbKey === `${mode}-${item.id}`} label={showingProgress ? new Date(item.created_at).toLocaleDateString() : item.title || "Angle"} onReveal={onReveal} onOpen={() => onSelectItem(item)} />)}
      </RailShell>
    </section>
  );
}

function RailShell({ heightClass, children }: { heightClass: string; children: ReactNode }) {
  return (
    <div className="relative mx-3 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-sm">
      <div className={`flex ${heightClass} gap-2 overflow-x-auto p-1 no-scrollbar`}>
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-9 border-l border-cyan-300/15 bg-gradient-to-r from-slate-950 via-slate-950/65 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-9 border-r border-cyan-300/15 bg-gradient-to-l from-slate-950 via-slate-950/65 to-transparent" />
    </div>
  );
}

function AttachmentsSheet({ pins, onClose, onRemove }: { pins: PhotoAttachmentPin[]; onClose: () => void; onRemove: (pinId: string) => void }) {
  const [preview, setPreview] = useState<{ file: PhotoAttachmentFile; url: string | null; loading: boolean; error: string | null } | null>(null);

  async function openPreview(file: PhotoAttachmentFile) {
    setPreview({ file, url: null, loading: true, error: null });
    try {
      const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}&mode=preview`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) throw new Error(data?.error ?? "Preview unavailable.");
      setPreview({ file, url: data.url, loading: false, error: null });
    } catch (error) {
      setPreview({ file, url: null, loading: false, error: error instanceof Error ? error.message : "Preview unavailable." });
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/55" role="dialog" aria-label="Pinned attachments" onClick={onClose}>
      <div className="rounded-t-3xl border-t border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-100">Pinned attachments ({pins.length})</p><button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white/80" aria-label="Close attachments"><X className="h-4 w-4" /></button></div>
        {pins.length === 0 ? <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs font-bold text-white/60">Long-press the photo to drop a pin and attach files.</p> : <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 no-scrollbar">{pins.map((pin) => <li key={pin.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2"><div className="flex items-center gap-3"><Paperclip className="h-4 w-4 shrink-0 text-cyan-300" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{pin.label}</p><p className="truncate text-[11px] font-bold text-white/60">{pin.files.length} file{pin.files.length === 1 ? "" : "s"}{pin.note ? ` · ${pin.note}` : ""}</p></div><button type="button" onClick={() => onRemove(pin.id)} className="rounded-full border border-white/15 p-2 text-white/75 hover:border-rose-400 hover:text-rose-200" aria-label={`Remove ${pin.label}`}><Trash2 className="h-4 w-4" /></button></div>{pin.files.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{pin.files.map((file) => <button key={file.id} type="button" onClick={() => void openPreview(file)} className="inline-flex max-w-full items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-black text-cyan-100"><Eye className="h-3 w-3" /><span className="truncate">{file.name}</span></button>)}</div>}</li>)}</ul>}
      </div>
      {preview && <FilePreviewModal preview={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function FilePreviewModal({ preview, onClose }: { preview: { file: PhotoAttachmentFile; url: string | null; loading: boolean; error: string | null }; onClose: () => void }) {
  const isImage = preview.file.type.startsWith("image/");
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-label={`Preview ${preview.file.name}`} onClick={onClose}>
      <div className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2"><p className="min-w-0 truncate text-sm font-black text-white">{preview.file.name}</p><button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white/80" aria-label="Close preview"><X className="h-4 w-4" /></button></div>
        <div className="min-h-72 flex-1 bg-black">
          {preview.loading ? <div className="flex h-72 items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div> : preview.error ? <div className="flex h-72 items-center justify-center p-6 text-center text-sm font-bold text-rose-100">{preview.error}</div> : isImage ? <img src={preview.url ?? ""} alt={preview.file.name} className="max-h-[70dvh] w-full object-contain" /> : <iframe src={preview.url ?? ""} title={preview.file.name} className="h-[70dvh] w-full bg-white" />}
        </div>
        {preview.url && <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-black text-cyan-100"><ExternalLink className="h-4 w-4" /> Open full file</a>}
      </div>
    </div>
  );
}

function ThumbButton({ item, thumbKey, active, revealed, label, onReveal, onOpen, onDoubleClick }: { item: CaptureItemRecord; thumbKey: string; active: boolean; revealed: boolean; label: string; onReveal: (key: string) => void; onOpen: () => void; onDoubleClick?: () => void }) {
  function handleClick() {
    if (!revealed) {
      onReveal(thumbKey);
      return;
    }
    onOpen();
  }

  return <button type="button" onClick={handleClick} onDoubleClick={onDoubleClick ?? onOpen} className={`relative aspect-square h-full shrink-0 overflow-hidden border ${active ? "border-blue-500 ring-2 ring-blue-500/30" : "border-white/20"}`} aria-label={revealed ? `Open ${label}` : `Show ${label} name`}><PhotoThumb item={item} />{revealed && <span className="absolute inset-x-0 bottom-0 truncate bg-black/75 px-1 py-0.5 text-left text-[9px] font-black text-white">{label}</span>}</button>;
}

function dispatchCanvasEvent(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

function getPhotoThumbUrl(item: CaptureItemRecord) {
  return getCaptureImageUrl(item);
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
