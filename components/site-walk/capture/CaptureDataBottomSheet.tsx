"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Camera, GripHorizontal, Loader2, Mic, SkipForward, Sparkles } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord | null;
  draft: CaptureItemDraft | null;
  saveState: string;
  aiState: string;
  aiMessage: string | null;
  currentLocation: string;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onCapture: () => void;
  onFormatNotes: () => void;
  onSaveNextStop: () => void;
};

export function CaptureDataBottomSheet({ item, draft, saveState, aiState, aiMessage, currentLocation, onDraftChange, onCapture, onFormatNotes, onSaveNextStop }: Props) {
  const [expanded, setExpanded] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const isSaving = saveState === "saving";
  const aiBusy = aiState === "loading" || aiState === "formatting";

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = event.clientY - dragStartY.current;
    if (delta < -18) setExpanded(true);
    if (delta > 18) setExpanded(false);
    dragStartY.current = null;
  }

  return (
    <GlassCard
      className={`fixed inset-x-0 bottom-0 z-40 rounded-b-none border-x-0 border-b-0 bg-slate-950/92 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 shadow-[0_-28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 md:left-1/2 md:max-w-3xl md:-translate-x-1/2 md:rounded-t-[2rem] md:border-x ${expanded ? "translate-y-0" : "translate-y-[calc(100%-5.7rem)]"}`}
      aria-label="Swipe-up capture details"
    >
      <div className="touch-none" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="mx-auto flex w-full flex-col items-center gap-1 pb-2" aria-label={expanded ? "Collapse capture details" : "Expand capture details"}>
          <span className="h-1.5 w-14 rounded-full bg-white/25" />
          <GripHorizontal className="h-4 w-4 text-white/35" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-amber-300">{currentLocation}</p>
          <h2 className="truncate text-base font-black text-white">{item?.title || "Ready for next field stop"}</h2>
        </div>
        <button type="button" onClick={onCapture} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-400">
          <Camera className="h-5 w-5" /> Capture
        </button>
      </div>

      {expanded && (
        <div className="mt-4 max-h-[58dvh] space-y-3 overflow-y-auto pr-1 no-scrollbar">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Field note</span>
            <textarea
              value={draft?.notes ?? ""}
              onChange={(event) => onDraftChange({ notes: event.target.value })}
              rows={5}
              disabled={!draft}
              placeholder="Type what happened, what changed, and who owns the next action…"
              className="mt-2 w-full rounded-3xl border border-white/10 bg-black/35 px-4 py-3 text-base leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200" aria-disabled="true">
              <Mic className="h-4 w-4 text-amber-300" /> Voice Dictation
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-slate-400">Stub</span>
            </button>
            <button type="button" onClick={onFormatNotes} disabled={!draft || aiBusy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-black text-amber-100 disabled:opacity-60">
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI Format Note
            </button>
          </div>

          {aiMessage && <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">{aiMessage}</p>}

          <button type="button" onClick={onSaveNextStop} disabled={isSaving} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl bg-amber-500 px-5 text-base font-black text-slate-950 shadow-[0_0_28px_rgba(245,158,11,0.34)] transition hover:bg-amber-400 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <SkipForward className="h-5 w-5" />}
            Save &amp; Next Stop
          </button>
        </div>
      )}
    </GlassCard>
  );
}