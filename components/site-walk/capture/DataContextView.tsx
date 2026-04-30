"use client";

import { useState } from "react";
import { ArrowRight, ChevronLeft, Flag, Loader2, Mic, Sparkles } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { CAPTURE_CLASSIFICATIONS, CAPTURE_PRIORITIES, CAPTURE_ITEM_STATUSES, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord | null;
  draft: CaptureItemDraft | null;
  assignees: CaptureAssignee[];
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
  aiState: "idle" | "formatting" | "blocked" | "error";
  aiMessage: string | null;
  currentLocation: string;
  itemDetail: string;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onLocationChange: (location: string) => void;
  onItemDetailChange: (detail: string) => void;
  onFormatNotes: () => void;
  onBack: () => void;
  onAddAngle: () => void;
  onSaveNextLocation: () => void;
  onSaveFinishWalk: () => void;
};

const inputClass = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-base font-bold text-slate-50 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

type SpeechRecognitionResultLike = { readonly length: number; [index: number]: { transcript: string } };
type SpeechRecognitionEventLike = Event & { results: { readonly length: number; [index: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function DataContextView({ item, draft, assignees, saveState, aiState, aiMessage, currentLocation, itemDetail, onDraftChange, onLocationChange, onItemDetailChange, onFormatNotes, onBack, onAddAngle, onSaveNextLocation, onSaveFinishWalk }: Props) {
  const [dictationState, setDictationState] = useState<"idle" | "listening" | "unsupported" | "error">("idle");
  const assignable = assignees.filter((assignee) => assignee.assignable);

  function startDictation() {
    if (!draft) return;
    const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setDictationState("unsupported");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript ?? "").join(" ").trim();
      if (text) onDraftChange({ notes: `${draft.notes}${draft.notes.trim() ? "\n" : ""}${text}` });
    };
    recognition.onerror = () => setDictationState("error");
    recognition.onend = () => setDictationState((current) => current === "listening" ? "idle" : current);
    setDictationState("listening");
    recognition.start();
  }

  if (!item || !draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <h2 className="text-2xl font-black">Capture a photo first</h2>
        <p className="mt-2 max-w-sm text-sm font-bold text-slate-300">Take one photo, then add field notes, status, assignment, and priority details.</p>
        <button type="button" onClick={onBack} className="mt-5 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Back to camera</button>
      </div>
    );
  }

  const fullTitle = itemDetail.trim() ? `${currentLocation.trim()} — ${itemDetail.trim()}` : currentLocation.trim();
  const previewUrl = getCaptureImageUrl(item);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-3">
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100">
          <ChevronLeft className="h-4 w-4" /> Visual
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-black">Photo details</p>
          <p className="text-[11px] font-bold text-cyan-200">{saveLabel(saveState)}</p>
        </div>
        <button type="button" onClick={onFormatNotes} disabled={aiState === "formatting" || !draft.notes.trim()} className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 disabled:opacity-50">
          {aiState === "formatting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <section className="grid shrink-0 grid-cols-[104px_minmax(0,1fr)] gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <div className="h-28 overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900">
            {previewUrl ? <img src={previewUrl} alt="Captured reference" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">No preview</div>}
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <FieldSelect value={draft.classification} values={CAPTURE_CLASSIFICATIONS} onChange={(value) => onDraftChange({ classification: value as CaptureItemDraft["classification"] })} />
            <FieldSelect value={draft.priority} values={CAPTURE_PRIORITIES} onChange={(value) => onDraftChange({ priority: value as CaptureItemDraft["priority"] })} />
            <FieldSelect value={draft.status} values={CAPTURE_ITEM_STATUSES} onChange={(value) => onDraftChange({ status: value as CaptureItemDraft["status"] })} />
            <select value={draft.assignedTo} onChange={(event) => onDraftChange({ assignedTo: event.target.value })} className={inputClass} aria-label="Assignee">
              <option value="">Unassigned</option>
              {assignable.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.label}</option>)}
            </select>
          </div>
        </section>

        <p className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-300">Captured: {new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>

        <section className="shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-200/80">Current Location</span>
              <input value={currentLocation} onChange={(event) => onLocationChange(event.target.value)} className={inputClass} placeholder="AOB Room 205" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-200/80">Item detail</span>
              <input value={itemDetail} onChange={(event) => onItemDetailChange(event.target.value)} className={inputClass} placeholder="Electrical panel, networking rough-in…" />
            </label>
          </div>
          <p className="mt-2 truncate rounded-2xl bg-slate-950/60 px-3 py-2 text-xs font-black text-slate-300">Title: {fullTitle}</p>
        </section>

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 focus-within:pb-[22dvh]">
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange({ notes: event.target.value })}
            inputMode="text"
            placeholder="Field notes, issue details, owner direction, or inspection observations…"
            className="h-full min-h-0 w-full resize-none bg-transparent pb-14 pr-12 text-base font-medium leading-7 text-slate-50 outline-none placeholder:text-slate-500"
          />
          <button type="button" onClick={startDictation} className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950" aria-label="Start voice dictation">
            <Mic className="h-5 w-5" />
          </button>
        </section>

        {(dictationState !== "idle" || aiMessage) && <p className="shrink-0 text-xs font-bold text-slate-300">{dictationState === "listening" ? "Listening…" : dictationState === "unsupported" ? "Dictation unavailable; use the keyboard microphone." : dictationState === "error" ? "Dictation could not start." : aiMessage}</p>}

        <footer className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <button type="button" onClick={onSaveNextLocation} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-3 py-3 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.2)]">Save &amp; Next Location <ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={onAddAngle} className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-black text-slate-100">Add Angle</button>
          <button type="button" onClick={onSaveFinishWalk} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-3 text-sm font-black text-emerald-100"><Flag className="h-4 w-4" /> Save &amp; Finish Walk</button>
        </footer>
      </main>
    </div>
  );
}

function FieldSelect({ value, values, onChange }: { value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {values.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
    </select>
  );
}

function saveLabel(state: Props["saveState"]) {
  if (state === "saving") return "Saving…";
  if (state === "saved") return "Saved";
  if (state === "dirty") return "Autosave pending";
  if (state === "error") return "Save failed";
  return "Ready";
}
