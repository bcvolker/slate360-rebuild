"use client";

import { useState } from "react";
import { ChevronLeft, Loader2, Mic, Sparkles } from "lucide-react";
import { CAPTURE_CLASSIFICATIONS, CAPTURE_PRIORITIES, CAPTURE_ITEM_STATUSES, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord | null;
  draft: CaptureItemDraft | null;
  assignees: CaptureAssignee[];
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
  aiState: "idle" | "formatting" | "blocked" | "error";
  aiMessage: string | null;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onFormatNotes: () => void;
  onBack: () => void;
};

const inputClass = "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-base font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15";

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

export function DataContextView({ item, draft, assignees, saveState, aiState, aiMessage, onDraftChange, onFormatNotes, onBack }: Props) {
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
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-950">
        <h2 className="text-2xl font-black">Capture an angle first</h2>
        <p className="mt-2 max-w-sm text-sm font-bold text-slate-600">Take a photo, then use notes to classify, assign, and save the field item.</p>
        <button type="button" onClick={onBack} className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Back to camera</button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3">
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 px-3 text-sm font-black text-slate-800">
          <ChevronLeft className="h-4 w-4" /> Visual
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-black">Item data</p>
          <p className="text-[11px] font-bold text-slate-500">{saveLabel(saveState)}</p>
        </div>
        <button type="button" onClick={onFormatNotes} disabled={aiState === "formatting" || !draft.notes.trim()} className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-3 text-sm font-black text-white disabled:opacity-50">
          {aiState === "formatting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <section className="grid shrink-0 grid-cols-[96px_minmax(0,1fr)] gap-3">
          <div className="h-24 overflow-hidden rounded-2xl border border-slate-300 bg-slate-950">
            {item.local_preview_url && <img src={item.local_preview_url} alt="" className="h-full w-full object-cover" />}
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

        <input value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} className={inputClass} placeholder="Short item title" />

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-300 bg-white p-3 focus-within:pb-[22dvh]">
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange({ notes: event.target.value })}
            inputMode="text"
            placeholder="Dictation-friendly notes. The text area owns the remaining screen so the keyboard does not cover the active text."
            className="h-full min-h-0 w-full resize-none bg-transparent pb-14 pr-12 text-base font-medium leading-7 text-slate-950 outline-none"
          />
          <button type="button" onClick={startDictation} className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white" aria-label="Start voice dictation">
            <Mic className="h-5 w-5" />
          </button>
        </section>

        {(dictationState !== "idle" || aiMessage) && <p className="shrink-0 text-xs font-bold text-slate-600">{dictationState === "listening" ? "Listening…" : dictationState === "unsupported" ? "Dictation unavailable; use the keyboard microphone." : dictationState === "error" ? "Dictation could not start." : aiMessage}</p>}
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
