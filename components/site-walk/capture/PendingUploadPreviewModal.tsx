"use client";

import { FileImage } from "lucide-react";

type Props = {
  fileName: string;
  imageUrl: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PendingUploadPreviewModal({ fileName, imageUrl, busy, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label="Confirm uploaded image" onClick={onCancel}>
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-amber-200"><FileImage className="h-4 w-4" /> Preview upload</div>
        <div className="mt-4 flex justify-center rounded-3xl bg-black p-3">
          <img src={imageUrl} alt={fileName} className="max-h-[60vh] max-w-full rounded-2xl object-contain" draggable={false} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onConfirm} disabled={busy} className="min-h-12 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60">Confirm &amp; Attach</button>
          <button type="button" onClick={onCancel} className="min-h-12 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:border-amber-300/50">Cancel</button>
        </div>
      </div>
    </div>
  );
}