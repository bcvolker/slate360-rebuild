"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type BudgetRow = {
  id: string;
  cost_code: string;
  description: string | null;
  budget_amount: number;
  spent_amount: number;
  category: string | null;
  change_order_amount: number;
  forecast_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type FormData = {
  costCode: string;
  description: string;
  budgetAmount: string;
  spentAmount: string;
  category: string;
  changeOrderAmount: string;
  forecastAmount: string;
  notes: string;
};

const CATEGORIES = [
  "General Conditions",
  "Site Work",
  "Concrete",
  "Masonry",
  "Metals",
  "Wood & Plastics",
  "Thermal & Moisture",
  "Doors & Windows",
  "Finishes",
  "Specialties",
  "Equipment",
  "Furnishings",
  "Special Construction",
  "Conveying",
  "Mechanical",
  "Electrical",
  "Contingency",
  "Overhead & Profit",
];

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const EMPTY_FORM: FormData = {
  costCode: "",
  description: "",
  budgetAmount: "0",
  spentAmount: "0",
  category: "",
  changeOrderAmount: "0",
  forecastAmount: "0",
  notes: "",
};

/* ── Main Component ─────────────────────────────────────────────── */
export default function ProjectBudgetPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, { cache: "no-store" });
      const payload = await res.json();
      setRows(Array.isArray(payload.budgetRows) ? payload.budgetRows : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  /* ── Filtered ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.cost_code.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "all") list = list.filter((r) => r.category === filterCategory);
    return list;
  }, [rows, search, filterCategory]);

  /* ── Totals ───────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.budget += Number(row.budget_amount ?? 0);
        acc.spent += Number(row.spent_amount ?? 0);
        acc.changeOrders += Number(row.change_order_amount ?? 0);
        acc.forecast += Number(row.forecast_amount ?? 0);
        return acc;
      },
      { budget: 0, spent: 0, changeOrders: 0, forecast: 0 }
    );
  }, [rows]);

  const revisedBudget = totals.budget + totals.changeOrders;
  const variance = revisedBudget - totals.spent;
  const pctSpent = revisedBudget > 0 ? Math.round((totals.spent / revisedBudget) * 100) : 0;

  /* ── Create / Update ──────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.costCode.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Line item updated" : "Line item added");
      setShowCreate(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setToast("Error saving line item");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this line item?")) return;
    try {
      await fetch(`/api/projects/${projectId}/budget`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setToast("Line item deleted");
      await load();
    } catch {
      setToast("Error deleting");
    }
  };

  /* ── Edit ──────────────────────────────────────────────────────── */
  const startEdit = (row: BudgetRow) => {
    setForm({
      costCode: row.cost_code,
      description: row.description ?? "",
      budgetAmount: String(row.budget_amount),
      spentAmount: String(row.spent_amount),
      category: row.category ?? "",
      changeOrderAmount: String(row.change_order_amount ?? 0),
      forecastAmount: String(row.forecast_amount ?? 0),
      notes: row.notes ?? "",
    });
    setEditingId(row.id);
    setShowCreate(true);
  };

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    const csvRows = [
      ["Cost Code", "Description", "Category", "Original Budget", "Change Orders", "Revised Budget", "Spent", "Forecast", "Variance", "Notes"],
      ...filtered.map((r) => {
        const budget = Number(r.budget_amount ?? 0);
        const co = Number(r.change_order_amount ?? 0);
        const spent = Number(r.spent_amount ?? 0);
        return [
          r.cost_code, r.description ?? "", r.category ?? "",
          budget.toFixed(2), co.toFixed(2), (budget + co).toFixed(2),
          spent.toFixed(2), (Number(r.forecast_amount ?? 0)).toFixed(2),
          (budget + co - spent).toFixed(2), r.notes ?? "",
        ];
      }),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Budget exported");
  };

  /* ── Snapshot ──────────────────────────────────────────────────── */
  const onSaveSnapshot = async () => {
    if (!projectId || rows.length === 0) return;
    setSnapshotSaving(true);
    try {
      const csvRows = [
        ["Cost Code","Description","Budget","Spent","Variance"],
        ...rows.map((r) => {
          const b = Number(r.budget_amount ?? 0);
          const s = Number(r.spent_amount ?? 0);
          return [r.cost_code, r.description ?? "", b.toFixed(2), s.toFixed(2), (b - s).toFixed(2)];
        }),
      ];
      const csv = csvRows.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const file = new File([csv], `budget-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, { type: "text/csv" });
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/projects/${projectId}/budget/snapshot`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setToast("Snapshot saved to Files");
    } catch {
      setToast("Error saving snapshot");
    } finally {
      setSnapshotSaving(false);
    }
  };

  if (!projectId) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;
  }

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Financials</p>
          <h2 className="text-xl font-black text-gray-900">Budget & Cost Control</h2>
          <p className="mt-1 text-sm text-gray-500">Track original budget, change orders, spend, and forecasts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download size={14} /> Export
          </button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            {snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
            <Plus size={15} /> Add Line Item
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Original Budget", value: fmtCurrency(totals.budget), icon: DollarSign, color: "text-gray-900" },
          { label: "Change Orders", value: fmtCurrency(totals.changeOrders), icon: Plus, color: totals.changeOrders > 0 ? "text-amber-600" : "text-gray-900" },
          { label: "Revised Budget", value: fmtCurrency(revisedBudget), icon: DollarSign, color: "text-blue-700" },
          { label: "Spent to Date", value: fmtCurrency(totals.spent), icon: TrendingDown, color: "text-gray-900" },
          { label: "Variance", value: fmtCurrency(variance), icon: variance >= 0 ? TrendingUp : TrendingDown, color: variance >= 0 ? "text-emerald-600" : "text-red-600" },
          { label: "% Spent", value: `${pctSpent}%`, icon: DollarSign, color: pctSpent > 90 ? "text-red-600" : "text-gray-900" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={12} className="text-gray-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
            </div>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cost codes…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
          <Filter size={14} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Budget Table ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading budget…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">No budget line items yet</p>
            <p className="mt-1 text-xs text-gray-400">Click &quot;Add Line Item&quot; to start tracking costs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Cost Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Change Orders</th>
                  <th className="px-4 py-3 text-right">Revised</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const budget = Number(row.budget_amount ?? 0);
                  const co = Number(row.change_order_amount ?? 0);
                  const revised = budget + co;
                  const spent = Number(row.spent_amount ?? 0);
                  const rowVariance = revised - spent;
                  const isExpanded = expandedId === row.id;

                  return (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{row.cost_code}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{row.description || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.category || "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(budget)}</td>
                      <td className={`px-4 py-3 text-right ${co !== 0 ? "text-amber-700 font-semibold" : "text-gray-400"}`}>{co !== 0 ? fmtCurrency(co) : "—"}</td>
                      <td className="px-4 py-3 text-right text-blue-700 font-semibold">{fmtCurrency(revised)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(spent)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${rowVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtCurrency(rowVariance)}</td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => startEdit(row)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(row.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
                          {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-800">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>Totals</td>
                  <td className="px-4 py-3 text-right">{fmtCurrency(totals.budget)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{fmtCurrency(totals.changeOrders)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{fmtCurrency(revisedBudget)}</td>
                  <td className="px-4 py-3 text-right">{fmtCurrency(totals.spent)}</td>
                  <td className={`px-4 py-3 text-right ${variance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtCurrency(variance)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Slide-over ────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Line Item" : "Add Line Item"}</h3>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Cost Code *</label>
                  <input type="text" value={form.costCode} onChange={(e) => setForm({ ...form, costCode: e.target.value })} placeholder="e.g. 03-100" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    <option value="">Select category…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Line item description" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Original Budget ($)</label>
                  <input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Spent ($)</label>
                  <input type="number" step="0.01" value={form.spentAmount} onChange={(e) => setForm({ ...form, spentAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Change Orders ($)</label>
                  <input type="number" step="0.01" value={form.changeOrderAmount} onChange={(e) => setForm({ ...form, changeOrderAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Forecast ($)</label>
                  <input type="number" step="0.01" value={form.forecastAmount} onChange={(e) => setForm({ ...form, forecastAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] resize-none" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.costCode.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? "Update" : "Add Line Item"}
                </button>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>
      )}
    </section>
  );
}
