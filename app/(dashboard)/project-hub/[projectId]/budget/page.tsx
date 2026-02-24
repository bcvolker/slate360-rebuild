"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

type BudgetRow = {
  id: string;
  cost_code: string;
  description: string | null;
  budget_amount: number;
  spent_amount: number;
};

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ProjectBudgetPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costCode, setCostCode] = useState("");
  const [description, setDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("0");
  const [spentAmount, setSpentAmount] = useState("0");

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as { budgetRows?: BudgetRow[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load budget");
      setRows(Array.isArray(payload.budgetRows) ? payload.budgetRows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load budget");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const budget = Number(row.budget_amount ?? 0);
        const spent = Number(row.spent_amount ?? 0);
        acc.budget += budget;
        acc.spent += spent;
        return acc;
      },
      { budget: 0, spent: 0 }
    );
  }, [rows]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costCode,
          description,
          budgetAmount: Number(budgetAmount || 0),
          spentAmount: Number(spentAmount || 0),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to add line item");

      setOpen(false);
      setCostCode("");
      setDescription("");
      setBudgetAmount("0");
      setSpentAmount("0");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add line item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Financials</p>
          <h2 className="text-lg font-black text-gray-900">Budget</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500]"
        >
          <Plus size={14} /> Add Line Item
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading budget…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No budget line items yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Cost Code</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const budget = Number(row.budget_amount ?? 0);
                const spent = Number(row.spent_amount ?? 0);
                const variance = budget - spent;
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.cost_code}</td>
                    <td className="px-4 py-3 text-gray-700">{row.description || "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(budget)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(spent)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${variance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {fmtCurrency(variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Totals</td>
                <td className="px-4 py-3 text-right">{fmtCurrency(totals.budget)}</td>
                <td className="px-4 py-3 text-right">{fmtCurrency(totals.spent)}</td>
                <td className={`px-4 py-3 text-right ${totals.budget - totals.spent >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {fmtCurrency(totals.budget - totals.spent)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Add Budget Line Item</h3>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Cost Code</label>
                <input value={costCode} onChange={(e) => setCostCode(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Budget Amount</label>
                  <input type="number" step="0.01" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Spent Amount</label>
                  <input type="number" step="0.01" value={spentAmount} onChange={(e) => setSpentAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Add Line Item"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
