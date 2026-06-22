"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  ending: boolean;
  onClose: () => void;
  onExit: () => void;
  onEnd: () => void;
};

export function SessionExitModal({ open, ending, onClose, onExit, onEnd }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 text-slate-50 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--graphite-muted)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Leave this walk?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">Exit keeps the walk in progress. End walk marks the session complete and returns you to Active Walks.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)]">Cancel</button>
          <button type="button" onClick={onExit} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-slate-200 hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)]">Exit</button>
          <button type="button" onClick={onEnd} disabled={ending} className="rounded-xl bg-[var(--graphite-primary)] px-3 py-2 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] disabled:opacity-60">{ending ? "Ending…" : "End Walk"}</button>
        </div>
      </div>
    </div>
  );
}
