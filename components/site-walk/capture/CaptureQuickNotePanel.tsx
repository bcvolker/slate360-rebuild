"use client";

import { useState } from "react";
import { Mic, PencilLine } from "lucide-react";

type NoteMode = "text" | "voice";

type Props = {
  busy: boolean;
  onSaveTextNote: (text: string, mode: NoteMode) => Promise<void>;
};

export function CaptureQuickNotePanel({ busy, onSaveTextNote }: Props) {
  const [noteText, setNoteText] = useState("");

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-black text-slate-100"><PencilLine className="h-4 w-4 text-[var(--graphite-primary)]" /> Quick text / voice note</div>
      <textarea
        value={noteText}
        onChange={(event) => setNoteText(event.target.value)}
        rows={5}
        inputMode="text"
        placeholder="Tap here to type, or use the native iOS/Android microphone on the keyboard to dictate a field note…"
        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-[var(--graphite-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => void onSaveTextNote(noteText, "text")} disabled={busy || !noteText.trim()} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-200 hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] disabled:opacity-60">Save Text Note</button>
        <button type="button" onClick={() => void onSaveTextNote(noteText, "voice")} disabled={busy || !noteText.trim()} className="min-h-11 rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] disabled:opacity-60"><span className="inline-flex items-center gap-2"><Mic className="h-4 w-4" /> Save Voice Note</span></button>
      </div>
    </div>
  );
}