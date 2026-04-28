"use client";

import { useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { CAPTURE_CLASSIFICATIONS, CAPTURE_ITEM_STATUSES, CAPTURE_PRIORITIES, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord;
  draft: CaptureItemDraft;
  assignees: CaptureAssignee[];
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
  aiState: "idle" | "formatting" | "blocked" | "error";
  aiMessage: string | null;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onFormatNotes: () => void;
};

const inputClass = "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15";
const labelClass = "block text-xs font-black uppercase tracking-[0.14em] text-slate-600";

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

export function CaptureItemForm({ item, draft, assignees, saveState, aiState, aiMessage, onDraftChange, onFormatNotes }: Props) {
  const assignable = assignees.filter((assignee) => assignee.assignable);
  const contactOnly = assignees.filter((assignee) => !assignee.assignable);
  const [dictationState, setDictationState] = useState<"idle" | "listening" | "unsupported" | "error">("idle");

  function startDictation() {
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Item details</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{item.item_type.replace("_", " ")} · autosaves after edits</p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {item.local_preview_url && (
        <div className="overflow-hidden rounded-3xl border border-slate-300 bg-slate-950">
          <img src={item.local_preview_url} alt={item.title || "Captured photo"} className="max-h-48 w-full object-contain" />
        </div>
      )}

      <label className="space-y-2">
        <span className={labelClass}>Title</span>
        <input value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} className={inputClass} placeholder="Short field item title" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldSelect label="Classification" value={draft.classification} values={CAPTURE_CLASSIFICATIONS} onChange={(value) => onDraftChange({ classification: value as CaptureItemDraft["classification"] })} />
        <FieldSelect label="Priority" value={draft.priority} values={CAPTURE_PRIORITIES} onChange={(value) => onDraftChange({ priority: value as CaptureItemDraft["priority"] })} />
        <FieldSelect label="Status" value={draft.status} values={CAPTURE_ITEM_STATUSES} onChange={(value) => onDraftChange({ status: value as CaptureItemDraft["status"] })} />
        <label className="space-y-2">
          <span className={labelClass}>Due date</span>
          <input type="date" value={draft.dueDate} onChange={(event) => onDraftChange({ dueDate: event.target.value })} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Assignee</span>
          <select value={draft.assignedTo} onChange={(event) => onDraftChange({ assignedTo: event.target.value })} className={inputClass}>
            <option value="">Unassigned</option>
            {assignable.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.label} · {assignee.subtitle}</option>)}
            {contactOnly.length > 0 && <option disabled>── Stakeholders need a Slate360 user ──</option>}
            {contactOnly.map((assignee) => <option key={assignee.id} disabled>{assignee.label} · {assignee.subtitle}</option>)}
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <span className="flex items-center justify-between gap-3">
          <span className={labelClass}>Notes / voice dictation</span>
          <button type="button" onClick={onFormatNotes} disabled={aiState === "formatting" || !draft.notes.trim()} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-50">
            {aiState === "formatting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Format with AI
          </button>
        </span>
        <div className="relative">
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange({ notes: event.target.value })}
            rows={7}
            inputMode="text"
            placeholder="Tap the mic to dictate, or type field notes. The drawer adds focus padding so the keyboard never covers this text."
            className={`${inputClass} min-h-44 resize-y scroll-mt-28 pr-14 leading-7`}
          />
          <button type="button" onClick={startDictation} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700" aria-label="Start voice dictation">
            <Mic className="h-5 w-5" />
          </button>
        </div>
      </label>

      {dictationState === "listening" && <p className="text-xs font-black text-blue-800">Listening… speak your note now.</p>}
      {dictationState === "unsupported" && <p className="text-xs font-bold text-amber-800">Voice recognition is not available in this browser. Use the keyboard microphone instead.</p>}
      {dictationState === "error" && <p className="text-xs font-bold text-rose-700">Dictation could not start. Check microphone permission and try again.</p>}
      {aiMessage && <AiMessage state={aiState} message={aiMessage} />}
    </div>
  );
}

function FieldSelect({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {values.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}

function SaveIndicator({ state }: { state: Props["saveState"] }) {
  if (state === "saving") return <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">Saved</span>;
  if (state === "error") return <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-800">Save failed</span>;
  if (state === "dirty") return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">Unsaved edits</span>;
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Ready</span>;
}

function AiMessage({ state, message }: { state: Props["aiState"]; message: string }) {
  if (state === "blocked") {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{message} <a href="/settings/billing" className="underline">Upgrade or top up credits</a>.</div>;
  }
  return <p className={`text-sm font-bold ${state === "error" ? "text-rose-700" : "text-emerald-700"}`}>{message}</p>;
}
