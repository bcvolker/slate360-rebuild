"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { CAPTURE_TRADES } from "@/lib/types/site-walk-capture";

type Props = {
  projectId: string | null;
  initialTrades: string[];
  onClose: () => void;
  onSave: (trades: string[]) => Promise<void>;
};

export function ManageTradesModal({ projectId, initialTrades, onClose, onSave }: Props) {
  const [trades, setTrades] = useState<string[]>(() => (initialTrades.length > 0 ? [...initialTrades] : [...CAPTURE_TRADES]));
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addTrade() {
    const value = draft.trim();
    if (!value) return;
    if (trades.some((trade) => trade.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setTrades((current) => [...current, value]);
    setDraft("");
  }

  function removeTrade(index: number) {
    setTrades((current) => current.filter((_, position) => position !== index));
  }

  function moveTrade(index: number, direction: -1 | 1) {
    setTrades((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function resetToDefault() {
    setTrades([...CAPTURE_TRADES]);
  }

  async function handleSave() {
    if (!projectId) {
      setError("Open the walk from a real project to save trades.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trades);
      onClose();
    } catch (caught) {
      setError((caught as Error).message ?? "Could not save trades");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-primary)]">Project trades</p>
            <h2 className="mt-1 text-lg font-black text-white">Manage Trade Options</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close manage trades">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs font-bold leading-5 text-slate-400">These trades will appear in the Site Walk capture form for this project. Reorder, rename by removing and re-adding, or reset to the default Slate360 list.</p>

          <form onSubmit={(event) => { event.preventDefault(); addTrade(); }} className="flex items-center gap-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a trade (e.g. Glazing)" className="h-11 flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-[var(--graphite-primary)]" maxLength={64} />
            <button type="submit" disabled={!draft.trim()} className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-[var(--graphite-primary)] px-3 text-xs font-black uppercase tracking-wider text-[var(--graphite-canvas)] disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
            {trades.length === 0 && <li className="px-3 py-4 text-center text-xs font-bold text-slate-400">No trades configured.</li>}
            {trades.map((trade, index) => (
              <li key={`${trade}-${index}`} className="flex items-center gap-2 px-3 py-2">
                <span className="w-6 text-[10px] font-black text-slate-500">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex-1 truncate text-sm font-bold text-white">{trade}</span>
                <button type="button" onClick={() => moveTrade(index, -1)} disabled={index === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-[var(--graphite-primary)] disabled:opacity-30" aria-label={`Move ${trade} up`}><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => moveTrade(index, 1)} disabled={index === trades.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-[var(--graphite-primary)] disabled:opacity-30" aria-label={`Move ${trade} down`}><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => removeTrade(index)} className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10" aria-label={`Remove ${trade}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>

          <button type="button" onClick={resetToDefault} className="text-xs font-black uppercase tracking-wider text-slate-400 underline-offset-4 hover:text-[var(--graphite-primary)] hover:underline">Reset to Slate360 default trades</button>

          {error && <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100">{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || !projectId} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-4 py-2 text-xs font-black uppercase tracking-wider text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save trades
          </button>
        </footer>
      </div>
    </div>
  );
}
