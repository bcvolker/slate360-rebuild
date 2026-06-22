"use client";

import { FileImage } from "lucide-react";

type Props = {
  fileName: string;
  imageUrl: string;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirmAttach: () => void | Promise<void>;
};

export function PendingUploadPreviewModal({ fileName, imageUrl, busy, errorMessage, onCancel, onConfirmAttach }: Props) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label="Confirm uploaded image" onClick={() => { if (!busy) onCancel(); }}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[var(--graphite-primary)]"><FileImage className="h-4 w-4" /> Preview upload</div>
        {errorMessage && <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold leading-6 text-red-100">{errorMessage}</div>}
        <div className="mt-4 flex justify-center rounded-3xl bg-black p-3">
          <img src={imageUrl} alt={fileName} className="max-h-[52dvh] max-w-full rounded-2xl object-contain sm:max-h-[60vh]" draggable={false} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={(event) => { event.stopPropagation(); void onConfirmAttach(); }} disabled={busy} className="min-h-12 rounded-2xl bg-[var(--graphite-primary)] px-4 py-3 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] disabled:opacity-60">{busy ? "Attaching…" : "Confirm & Attach"}</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onCancel(); }} disabled={busy} className="min-h-12 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}