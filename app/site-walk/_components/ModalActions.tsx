import { Loader2 } from "lucide-react";

export function ModalActions({ onCancel, onConfirm, confirmLabel, busy, danger = false, disabled = false }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string; busy: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 hover:bg-white/[0.08]">
        Cancel
      </button>
      <button type="button" onClick={onConfirm} disabled={busy || disabled} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-slate-950 disabled:opacity-50 ${danger ? "bg-rose-400 hover:bg-rose-300" : "bg-amber-500 hover:bg-amber-400"}`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
      </button>
    </div>
  );
}
