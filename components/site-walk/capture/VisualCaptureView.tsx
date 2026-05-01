"use client";

import { Camera, ChevronLeft, ChevronRight, Eye, ExternalLink, Loader2, Paperclip, Plus, RotateCcw, RotateCw, Shapes, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAttachmentPins, type PhotoAttachmentFile, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
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

type DrawerMode = "view" | "markup" | "attach" | "angles";

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, onMarkupChange, onAttachmentPinsChange, onSelectItem, onNext }: Props) {
  const [ghostOn, setGhostOn] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [railMode, setRailMode] = useState<"angles" | "progress">("angles");
  const [revealedThumbKey, setRevealedThumbKey] = useState<string | null>(null);
  const photoItems = items.filter((item) => item.item_type === "photo");
  const activeItem = photoItems.find((item) => item.id === activeItemId) ?? null;
  const activeLocation = getLocationLabel(activeItem) ?? "Current location";
  const angleItems = photoItems.filter((item) => getLocationLabel(item) === activeLocation);
  const progressItems = angleItems.filter((item) => item.id !== activeItemId);
  const activePins = getItemPhotoAttachmentPins(activeItem);
  const markupMode = drawerOpen && drawerMode === "markup";

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0B0F15] text-slate-50">
      <TopCaptureControls location={activeLocation} modeLabel={modeLabel} onUndo={() => dispatchCanvasEvent(PHOTO_MARKUP_UNDO_EVENT)} onRedo={() => dispatchCanvasEvent(PHOTO_MARKUP_REDO_EVENT)} />

      <main className="min-h-0 flex-1 border-y border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.18),rgba(11,15,21,0.98)_55%)]">
        <div className="relative h-full min-h-0 overflow-hidden">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" activeItem={activeItem} markupEnabled={markupMode} onMarkupChange={onMarkupChange} onAttachmentPinsChange={onAttachmentPinsChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost alignment" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          <button type="button" onClick={onNext} className="absolute bottom-4 left-1/2 z-20 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-[0_0_28px_rgba(37,99,235,0.55)] ring-1 ring-blue-300/30 hover:bg-blue-500" aria-label="Add field details for this photo">
            Add Field Details <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </main>

      <BottomToolDrawer mode={drawerMode} open={drawerOpen} pinCount={activePins.length} onModeChange={(mode) => { setDrawerMode(mode); setDrawerOpen(true); }} onToggleOpen={() => setDrawerOpen((current) => !current)} onOpenAttachments={() => setAttachmentsOpen(true)}>
        {drawerMode === "view" && <StopCarousel items={photoItems} activeItemId={activeItemId} revealedThumbKey={revealedThumbKey} onReveal={setRevealedThumbKey} onSelectItem={onSelectItem} onOpenEdit={onNext} />}
        {drawerMode === "markup" && <div className="px-2 pb-2"><UnifiedVectorToolbar /></div>}
        {drawerMode === "attach" && <AttachDrawer pinCount={activePins.length} onOpenAttachments={() => setAttachmentsOpen(true)} />}
        {drawerMode === "angles" && <CaptureMediaRail mode={railMode} onModeChange={setRailMode} angleItems={angleItems.length > 0 ? angleItems : photoItems} progressItems={progressItems} activeItemId={activeItemId} ghostOn={ghostOn} ghostAvailable={!!ghostImageUrl} revealedThumbKey={revealedThumbKey} onReveal={setRevealedThumbKey} onToggleGhost={() => setGhostOn((current) => !current)} onAddProgress={() => { setRailMode("progress"); setGhostOn(true); requestCameraCapture("camera", "next_item"); }} onSelectItem={onSelectItem} />}
      </BottomToolDrawer>

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

function TopCaptureControls({ location, modeLabel, onUndo, onRedo }: { location: string; modeLabel: string; onUndo: () => void; onRedo: () => void }) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-[#0B0F15]/90 px-2 py-2 shadow-lg backdrop-blur-md">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <a href="/site-walk" className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/85"><ChevronLeft className="h-4 w-4" /> Back</a>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-black text-white">{location}</p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">{modeLabel || "Photos-only"}</p>
        </div>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onUndo} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/75" aria-label="Undo markup"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={onRedo} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/75" aria-label="Redo markup"><RotateCw className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}

function BottomToolDrawer({ mode, open, pinCount, children, onModeChange, onToggleOpen, onOpenAttachments }: { mode: DrawerMode; open: boolean; pinCount: number; children: ReactNode; onModeChange: (mode: DrawerMode) => void; onToggleOpen: () => void; onOpenAttachments: () => void }) {
  const tools: Array<{ mode: DrawerMode; label: string; icon: ReactNode }> = [
    { mode: "view", label: "View", icon: <Eye className="h-4 w-4" /> },
    { mode: "markup", label: "Markup", icon: <Shapes className="h-4 w-4" /> },
    { mode: "attach", label: `Attach${pinCount ? ` ${pinCount}` : ""}`, icon: <Paperclip className="h-4 w-4" /> },
    { mode: "angles", label: "Angles", icon: <Camera className="h-4 w-4" /> },
  ];
  return (
    <section className="shrink-0 border-t border-white/10 bg-[#0B0F15]/95 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl" aria-label="Capture tools">
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-white/20" />
      <div className="mx-3 grid grid-cols-4 rounded-2xl border border-white/10 bg-white/5 p-1">
        {tools.map((tool) => <button key={tool.mode} type="button" onClick={() => onModeChange(tool.mode)} className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl text-[10px] font-black uppercase tracking-[0.08em] ${mode === tool.mode && open ? "bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.35)]" : "text-white/65"}`}>{tool.icon}<span>{tool.label}</span></button>)}
      </div>
      <button type="button" onClick={onToggleOpen} className="mx-auto mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{open ? "Hide drawer" : "Show drawer"}</button>
      {open && <div className="mt-2">{children}</div>}
      {mode === "attach" && !open && <button type="button" onClick={onOpenAttachments} className="sr-only">Open attachments</button>}
    </section>
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

function AttachDrawer({ pinCount, onOpenAttachments }: { pinCount: number; onOpenAttachments: () => void }) {
  return (
    <div className="mx-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-xs font-bold text-white/65">Long-press the photo to drop a pin, then attach files or notes.</p>
      <button type="button" onClick={onOpenAttachments} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"><Paperclip className="h-4 w-4" /> Pinned attachments ({pinCount})</button>
    </div>
  );
}

function CaptureMediaRail({ mode, onModeChange, angleItems, progressItems, activeItemId, ghostOn, ghostAvailable, revealedThumbKey, onReveal, onToggleGhost, onAddProgress, onSelectItem }: { mode: "angles" | "progress"; onModeChange: (mode: "angles" | "progress") => void; angleItems: CaptureItemRecord[]; progressItems: CaptureItemRecord[]; activeItemId: string | null; ghostOn: boolean; ghostAvailable: boolean; revealedThumbKey: string | null; onReveal: (key: string) => void; onToggleGhost: () => void; onAddProgress: () => void; onSelectItem: (item: CaptureItemRecord) => void }) {
  const showingProgress = mode === "progress";
  const items = showingProgress ? progressItems : angleItems;
  return (
    <section className="shrink-0 bg-transparent pt-1" aria-label="Capture media rail">
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
