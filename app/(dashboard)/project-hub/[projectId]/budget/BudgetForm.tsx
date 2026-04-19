"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { type BudgetFormData, type BudgetRow, CATEGORIES, EMPTY_FORM, fmtCurrency } from "./_shared";

interface Props {
  form: BudgetFormData;
  setForm: (f: BudgetFormData) => void;
  editingId: string | null;
  saving: boolean;
  rows: BudgetRow[];
  totals: { budget: number; spent: number; changeOrders: number; forecast: number };
  revisedBudget: number;
  variance: number;
  pctSpent: number;
  categoryBreakdown: [string, { budget: number; spent: number }][];
  onSubmit: () => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}

export default function BudgetForm({ form, setForm, editingId, saving, rows, totals, revisedBudget, variance, pctSpent, categoryBreakdown, onSubmit, onDelete, onCancelEdit }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm flex flex-col">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h3 className="text-sm font-black text-white">{editingId ? "Edit Line Item" : "Add Line Item"}</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">{editingId ? "Update fields below" : "Fill in the details and click Add"}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {rows.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-3 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Budget Summary</p>
            <div className="flex justify-between text-xs"><span className="text-zinc-400">Original Budget</span><span className="font-bold text-white">{fmtCurrency(totals.budget)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-zinc-400">Change Orders</span><span className={`font-bold ${totals.changeOrders > 0 ? "text-amber-400" : "text-zinc-500"}`}>{fmtCurrency(totals.changeOrders)}</span></div>
            <div className="flex justify-between text-xs border-t border-zinc-700 pt-1.5"><span className="font-semibold text-zinc-300">Revised Budget</span><span className="font-black text-blue-400">{fmtCurrency(revisedBudget)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-zinc-400">Spent to Date</span><span className="font-bold text-white">{fmtCurrency(totals.spent)}</span></div>
            <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full transition-all ${pctSpent > 90 ? "bg-red-500" : pctSpent > 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(pctSpent, 100)}%` }} /></div>
            <div className="flex justify-between text-xs pt-0.5"><span className={`font-bold ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{variance >= 0 ? "✓ Under budget" : "⚠ Over budget"} {fmtCurrency(Math.abs(variance))}</span><span className="text-zinc-500">{pctSpent}% spent</span></div>
          </div>
        )}

        {categoryBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">By Category</p>
            {categoryBreakdown.map(([cat, vals]) => {
              const pct = vals.budget > 0 ? Math.min(100, Math.round((vals.spent / vals.budget) * 100)) : 0;
              return (
                <div key={cat} className="space-y-0.5">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-semibold text-zinc-400 truncate max-w-[140px]">{cat}</span><span className="text-[9px] text-zinc-500">{fmtCurrency(vals.budget)}</span></div>
                  <div className="w-full bg-zinc-700 rounded-full h-1"><div className={`h-1 rounded-full ${pct > 90 ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Cost Code *</label><input type="text" value={form.costCode} onChange={(e) => setForm({ ...form, costCode: e.target.value })} placeholder="03-100" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none"><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Description</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Line item description" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Budget ($)</label><input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Spent ($)</label><input type="number" step="0.01" value={form.spentAmount} onChange={(e) => setForm({ ...form, spentAmount: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Change Orders ($)</label><input type="number" step="0.01" value={form.changeOrderAmount} onChange={(e) => setForm({ ...form, changeOrderAmount: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Forecast ($)</label><input type="number" step="0.01" value={form.forecastAmount} onChange={(e) => setForm({ ...form, forecastAmount: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F59E0B]" /></div>
        </div>
        <div><label className="mb-1 block text-[10px] font-bold text-zinc-400">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notes…" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none resize-none" /></div>
      </div>
      <div className="border-t border-zinc-800 p-4 space-y-2">
        <button onClick={onSubmit} disabled={saving || !form.costCode.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{editingId ? "Update Line Item" : "Add Line Item"}</button>
        {editingId && (
          <div className="flex gap-2">
            <button onClick={onCancelEdit} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">Cancel</button>
            <button onClick={() => onDelete(editingId)} className="rounded-lg border border-red-900/40 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/30"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
