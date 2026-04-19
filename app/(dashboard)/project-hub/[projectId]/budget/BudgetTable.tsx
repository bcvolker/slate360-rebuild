"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, DollarSign, History, Loader2, Pencil, Trash2 } from "lucide-react";
import { type BudgetRow, fmtCurrency } from "./_shared";

interface Props {
  rows: BudgetRow[];
  filtered: BudgetRow[];
  loading: boolean;
  editingId: string | null;
  totals: { budget: number; spent: number; changeOrders: number; forecast: number };
  revisedBudget: number;
  variance: number;
  onEdit: (row: BudgetRow) => void;
  onHistory: (row: BudgetRow) => void;
  onDelete: (id: string) => void;
}

export default function BudgetTable({ rows, filtered, loading, editingId, totals, revisedBudget, variance, onEdit, onHistory, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-center text-sm text-zinc-400"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading budget…</div>;
  if (rows.length === 0) return (
    <div className="p-12 text-center">
      <DollarSign size={32} className="mx-auto mb-3 text-zinc-600" />
      <p className="text-sm font-semibold text-zinc-300">No budget line items yet</p>
      <p className="mt-2 text-xs text-zinc-500">Use <strong>New Budget</strong> to generate a standard CSI template,<br />or use the form on the right to add line items one by one.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
          <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Budget</th><th className="px-4 py-3 text-right">Revised</th><th className="px-4 py-3 text-right">Spent</th><th className="px-4 py-3 text-right">Variance</th><th className="px-4 py-3 text-center">·</th></tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const budget = Number(row.budget_amount ?? 0), co = Number(row.change_order_amount ?? 0), revised = budget + co, spent = Number(row.spent_amount ?? 0);
            const rowVariance = revised - spent;
            const isExpanded = expandedId === row.id;
            const pct = revised > 0 ? Math.min(100, Math.round((spent / revised) * 100)) : 0;
            const isEditing = editingId === row.id;
            return (
              <>
                <tr key={row.id} className={`border-t border-zinc-800 transition cursor-pointer ${isEditing ? "bg-[#3B82F6]/5 ring-1 ring-inset ring-[#3B82F6]/20" : "hover:bg-zinc-800/50"}`} onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-300">{row.cost_code}</td>
                  <td className="px-4 py-3 max-w-[160px] truncate font-medium text-zinc-200 text-xs">{row.description || "—"}</td>
                  <td className="px-4 py-3 text-[10px] text-zinc-500">{row.category || "—"}</td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-300">{fmtCurrency(budget)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-blue-400">{fmtCurrency(revised)}</td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-300">{fmtCurrency(spent)}</td>
                  <td className={`px-4 py-3 text-right text-xs font-bold ${rowVariance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtCurrency(rowVariance)}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-0.5">
                      <button onClick={() => { onEdit(row); setExpandedId(null); }} className={`rounded p-1 ${isEditing ? "text-[#3B82F6]" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`} title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => onHistory(row)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="History"><History size={12} /></button>
                      <button onClick={() => onDelete(row.id)} className="rounded p-1 text-zinc-500 hover:bg-red-950/30 hover:text-red-400" title="Delete"><Trash2 size={12} /></button>
                      {isExpanded ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${row.id}-exp`} className="bg-zinc-800/30 border-t border-zinc-800">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="flex flex-wrap gap-6 text-xs">
                        {row.notes && <div><span className="font-bold text-zinc-500">Notes: </span><span className="text-zinc-400">{row.notes}</span></div>}
                        <div><span className="font-bold text-zinc-500">Change Orders: </span><span className={`font-bold ${co > 0 ? "text-amber-400" : "text-zinc-600"}`}>{fmtCurrency(co)}</span></div>
                        <div><span className="font-bold text-zinc-500">Forecast: </span><span className="text-zinc-400">{fmtCurrency(Number(row.forecast_amount ?? 0))}</span></div>
                        <div className="flex items-center gap-2"><span className="font-bold text-zinc-500">Spend Progress:</span><div className="w-24 bg-zinc-700 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${pct > 90 ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} /></div><span className="text-zinc-500">{pct}%</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-zinc-700 bg-zinc-800/50 text-xs font-bold text-zinc-200">
          <tr>
            <td className="px-4 py-3" colSpan={3}>Totals ({filtered.length} items)</td>
            <td className="px-4 py-3 text-right">{fmtCurrency(totals.budget)}</td>
            <td className="px-4 py-3 text-right text-blue-400">{fmtCurrency(revisedBudget)}</td>
            <td className="px-4 py-3 text-right">{fmtCurrency(totals.spent)}</td>
            <td className={`px-4 py-3 text-right ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtCurrency(variance)}</td>
            <td className="px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
