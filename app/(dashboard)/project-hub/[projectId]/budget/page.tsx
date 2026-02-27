"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown, ChevronUp, DollarSign, Download, Filter,
  Loader2, Pencil, Plus, Save, Search, Trash2,
  TrendingDown, TrendingUp, X, FileText,
} from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";

type BudgetRow = {
  id: string; cost_code: string; description: string | null;
  budget_amount: number; spent_amount: number; category: string | null;
  change_order_amount: number; forecast_amount: number;
  notes: string | null; created_at: string; updated_at: string | null;
};
type FormData = {
  costCode: string; description: string; budgetAmount: string;
  spentAmount: string; category: string; changeOrderAmount: string;
  forecastAmount: string; notes: string;
};

const CATEGORIES = [
  "General Conditions","Site Work","Concrete","Masonry","Metals",
  "Wood & Plastics","Thermal & Moisture","Doors & Windows","Finishes",
  "Specialties","Equipment","Furnishings","Special Construction",
  "Conveying","Mechanical","Electrical","Contingency","Overhead & Profit",
];

const CSI_TEMPLATES = [
  { costCode: "01-000", description: "General Conditions", category: "General Conditions" },
  { costCode: "02-000", description: "Site Work", category: "Site Work" },
  { costCode: "03-000", description: "Concrete", category: "Concrete" },
  { costCode: "04-000", description: "Masonry", category: "Masonry" },
  { costCode: "05-000", description: "Metals", category: "Metals" },
  { costCode: "06-000", description: "Wood & Plastics", category: "Wood & Plastics" },
  { costCode: "07-000", description: "Thermal & Moisture Protection", category: "Thermal & Moisture" },
  { costCode: "08-000", description: "Doors & Windows", category: "Doors & Windows" },
  { costCode: "09-000", description: "Finishes", category: "Finishes" },
  { costCode: "14-000", description: "Conveying Systems", category: "Conveying" },
  { costCode: "15-000", description: "Mechanical / HVAC / Plumbing", category: "Mechanical" },
  { costCode: "16-000", description: "Electrical", category: "Electrical" },
  { costCode: "01-900", description: "Contingency (5%)", category: "Contingency" },
  { costCode: "01-990", description: "Overhead & Profit", category: "Overhead & Profit" },
];

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
const EMPTY_FORM: FormData = {
  costCode: "", description: "", budgetAmount: "0", spentAmount: "0",
  category: "", changeOrderAmount: "0", forecastAmount: "0", notes: "",
};

export default function ProjectBudgetPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile } = useProjectProfile(projectId);

  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showFromScratch, setShowFromScratch] = useState(false);
  const [scratchName, setScratchName] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, { cache: "no-store" });
      const payload = await res.json();
      setRows(Array.isArray(payload.budgetRows) ? payload.budgetRows : []);
    } catch { setRows([]); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.cost_code.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q)); }
    if (filterCategory !== "all") list = list.filter((r) => r.category === filterCategory);
    return list;
  }, [rows, search, filterCategory]);

  const totals = useMemo(() => rows.reduce((acc, row) => { acc.budget += Number(row.budget_amount ?? 0); acc.spent += Number(row.spent_amount ?? 0); acc.changeOrders += Number(row.change_order_amount ?? 0); acc.forecast += Number(row.forecast_amount ?? 0); return acc; }, { budget: 0, spent: 0, changeOrders: 0, forecast: 0 }), [rows]);

  const revisedBudget = totals.budget + totals.changeOrders;
  const variance = revisedBudget - totals.spent;
  const pctSpent = revisedBudget > 0 ? Math.round((totals.spent / revisedBudget) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { budget: number; spent: number }> = {};
    for (const r of rows) {
      const cat = r.category ?? "Uncategorized";
      if (!map[cat]) map[cat] = { budget: 0, spent: 0 };
      map[cat].budget += Number(r.budget_amount ?? 0);
      map[cat].spent += Number(r.spent_amount ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1].budget - a[1].budget).slice(0, 6);
  }, [rows]);

  const handleSubmit = async () => {
    if (!projectId || !form.costCode.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(`/api/projects/${projectId}/budget`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Line item updated" : "Line item added");
      setEditingId(null); setForm(EMPTY_FORM); await load();
    } catch { setToast("Error saving line item"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this line item?")) return;
    try {
      await fetch(`/api/projects/${projectId}/budget`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Line item deleted"); await load();
    } catch { setToast("Error deleting"); }
  };

  const startEdit = (row: BudgetRow) => {
    setForm({ costCode: row.cost_code, description: row.description ?? "", budgetAmount: String(row.budget_amount), spentAmount: String(row.spent_amount), category: row.category ?? "", changeOrderAmount: String(row.change_order_amount ?? 0), forecastAmount: String(row.forecast_amount ?? 0), notes: row.notes ?? "" });
    setEditingId(row.id);
  };

  const exportCSV = () => {
    const csvRows = [
      ["Cost Code","Description","Category","Original Budget","Change Orders","Revised Budget","Spent","Forecast","Variance","Notes"],
      ...filtered.map((r) => { const b = Number(r.budget_amount ?? 0), co = Number(r.change_order_amount ?? 0), s = Number(r.spent_amount ?? 0); return [r.cost_code, r.description ?? "", r.category ?? "", b.toFixed(2), co.toFixed(2), (b+co).toFixed(2), s.toFixed(2), (Number(r.forecast_amount ?? 0)).toFixed(2), (b+co-s).toFixed(2), r.notes ?? ""]; }),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `budget-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    setToast("Budget exported");
  };

  const onSaveSnapshot = async () => {
    if (!projectId || rows.length === 0) return;
    setSnapshotSaving(true);
    try {
      const csvRows = [["Cost Code","Description","Budget","Spent","Variance"], ...rows.map((r) => { const b = Number(r.budget_amount ?? 0), s = Number(r.spent_amount ?? 0); return [r.cost_code, r.description ?? "", b.toFixed(2), s.toFixed(2), (b-s).toFixed(2)]; })];
      const csv = csvRows.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const fd = new FormData(); fd.set("file", new File([csv], `budget-snapshot-${new Date().toISOString().slice(0,10)}.csv`, { type: "text/csv" }));
      const res = await fetch(`/api/projects/${projectId}/budget/snapshot`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setToast("Snapshot saved to Files");
    } catch { setToast("Error saving snapshot"); } finally { setSnapshotSaving(false); }
  };

  const handleFromScratch = async () => {
    if (!projectId || !scratchName.trim()) return;
    setSaving(true);
    try {
      const items = CSI_TEMPLATES.map((t) => ({ costCode: t.costCode, description: t.description, budgetAmount: "0", spentAmount: "0", category: t.category, changeOrderAmount: "0", forecastAmount: "0", notes: "" }));
      for (const item of items) {
        await fetch(`/api/projects/${projectId}/budget`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      }
      setToast("Budget template created with CSI divisions"); setShowFromScratch(false); setScratchName(""); await load();
    } catch { setToast("Error creating template"); } finally { setSaving(false); }
  };

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  const formCard = (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-black text-gray-900">{editingId ? "Edit Line Item" : "Add Line Item"}</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">{editingId ? "Update fields below" : "Fill in the details and click Add"}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Running summary */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Budget Summary</p>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Original Budget</span><span className="font-bold text-gray-900">{fmtCurrency(totals.budget)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Change Orders</span><span className={`font-bold ${totals.changeOrders > 0 ? "text-amber-600" : "text-gray-400"}`}>{fmtCurrency(totals.changeOrders)}</span></div>
            <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5"><span className="font-semibold text-gray-700">Revised Budget</span><span className="font-black text-blue-700">{fmtCurrency(revisedBudget)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Spent to Date</span><span className="font-bold text-gray-900">{fmtCurrency(totals.spent)}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full transition-all ${pctSpent > 90 ? "bg-red-500" : pctSpent > 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(pctSpent, 100)}%` }} /></div>
            <div className="flex justify-between text-xs pt-0.5"><span className={`font-bold ${variance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{variance >= 0 ? "✓ Under budget" : "⚠ Over budget"} {fmtCurrency(Math.abs(variance))}</span><span className="text-gray-400">{pctSpent}% spent</span></div>
          </div>
        )}

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">By Category</p>
            {categoryBreakdown.map(([cat, vals]) => {
              const pct = vals.budget > 0 ? Math.min(100, Math.round((vals.spent / vals.budget) * 100)) : 0;
              return (
                <div key={cat} className="space-y-0.5">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-semibold text-gray-600 truncate max-w-[140px]">{cat}</span><span className="text-[9px] text-gray-400">{fmtCurrency(vals.budget)}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-1"><div className={`h-1 rounded-full ${pct > 90 ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Cost Code *</label><input type="text" value={form.costCode} onChange={(e) => setForm({ ...form, costCode: e.target.value })} placeholder="03-100" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Description</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Line item description" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Budget ($)</label><input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Spent ($)</label><input type="number" step="0.01" value={form.spentAmount} onChange={(e) => setForm({ ...form, spentAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Change Orders ($)</label><input type="number" step="0.01" value={form.changeOrderAmount} onChange={(e) => setForm({ ...form, changeOrderAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
          <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Forecast ($)</label><input type="number" step="0.01" value={form.forecastAmount} onChange={(e) => setForm({ ...form, forecastAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF4D00]" /></div>
        </div>
        <div><label className="mb-1 block text-[10px] font-bold text-gray-700">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notes…" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none resize-none" /></div>
      </div>
      <div className="border-t border-gray-100 p-4 space-y-2">
        <button onClick={handleSubmit} disabled={saving || !form.costCode.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{editingId ? "Update Line Item" : "Add Line Item"}
        </button>
        {editingId && (
          <div className="flex gap-2">
            <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => void handleDelete(editingId)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Financials</p>
          <h2 className="text-xl font-black text-gray-900">Budget & Cost Control{profile.projectName && <span className="ml-2 text-base font-semibold text-gray-400">— {profile.projectName}</span>}</h2>
          <p className="mt-1 text-sm text-gray-500">Track original budget, change orders, spend, and forecasts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFromScratch(true)} disabled={rows.length > 0} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition" title="Start a fresh budget from CSI template">
            <FileText size={14} /> New Budget
          </button>
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">{snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot</button>
        </div>
      </div>

      {/* Stats */}
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
            <div className="flex items-center gap-1 mb-1"><s.icon size={11} className="text-gray-400" /><p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{s.label}</p></div>
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cost codes…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-[#FF4D00]" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
          <Filter size={13} /> Filters
        </button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none"><option value="all">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      )}

      {/* SPLIT LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Left — table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading budget…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">No budget line items yet</p>
              <p className="mt-2 text-xs text-gray-400">Use <strong>New Budget</strong> to generate a standard CSI template,<br />or use the form on the right to add line items one by one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-right">Revised</th>
                    <th className="px-4 py-3 text-right">Spent</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                    <th className="px-4 py-3 text-center">·</th>
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
                    const pct = revised > 0 ? Math.min(100, Math.round((spent / revised) * 100)) : 0;
                    const isEditing = editingId === row.id;
                    return (
                      <>
                        <tr key={row.id} className={`border-t border-gray-100 transition cursor-pointer ${isEditing ? "bg-orange-50 ring-1 ring-inset ring-[#FF4D00]/20" : "hover:bg-gray-50/50"}`} onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{row.cost_code}</td>
                          <td className="px-4 py-3 max-w-[160px] truncate font-medium text-gray-800 text-xs">{row.description || "—"}</td>
                          <td className="px-4 py-3 text-[10px] text-gray-500">{row.category || "—"}</td>
                          <td className="px-4 py-3 text-right text-xs text-gray-700">{fmtCurrency(budget)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-blue-700">{fmtCurrency(revised)}</td>
                          <td className="px-4 py-3 text-right text-xs text-gray-700">{fmtCurrency(spent)}</td>
                          <td className={`px-4 py-3 text-right text-xs font-bold ${rowVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtCurrency(rowVariance)}</td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-0.5">
                              <button onClick={() => { startEdit(row); setExpandedId(null); }} className={`rounded p-1 ${isEditing ? "text-[#FF4D00]" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`} title="Edit"><Pencil size={12} /></button>
                              <button onClick={() => void handleDelete(row.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={12} /></button>
                              {isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.id}-exp`} className="bg-gray-50/70 border-t border-gray-100">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="flex flex-wrap gap-6 text-xs">
                                {row.notes && <div><span className="font-bold text-gray-500">Notes: </span><span className="text-gray-600">{row.notes}</span></div>}
                                <div><span className="font-bold text-gray-500">Change Orders: </span><span className={`font-bold ${co > 0 ? "text-amber-700" : "text-gray-400"}`}>{fmtCurrency(co)}</span></div>
                                <div><span className="font-bold text-gray-500">Forecast: </span><span className="text-gray-600">{fmtCurrency(Number(row.forecast_amount ?? 0))}</span></div>
                                <div className="flex items-center gap-2"><span className="font-bold text-gray-500">Spend Progress:</span><div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${pct > 90 ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} /></div><span className="text-gray-400">{pct}%</span></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-xs font-bold text-gray-800">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>Totals ({filtered.length} items)</td>
                    <td className="px-4 py-3 text-right">{fmtCurrency(totals.budget)}</td>
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

        {/* Right panel — persistent form */}
        <div className="xl:sticky xl:top-4">{formCard}</div>
      </div>

      {/* From-scratch modal */}
      {showFromScratch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFromScratch(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">New Budget from Scratch</h3>
              <button onClick={() => setShowFromScratch(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500">This will pre-populate all standard CSI division codes (01–16) with $0 budget amounts. You can then fill in the actual values.</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Project Name</label>
              <input type="text" value={scratchName || profile.projectName} onChange={(e) => setScratchName(e.target.value)} placeholder={profile.projectName || "Enter project name…"} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Will create {CSI_TEMPLATES.length} line items</p>
              <div className="flex flex-wrap gap-1">{CSI_TEMPLATES.slice(0, 8).map((t) => <span key={t.costCode} className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-600">{t.costCode}</span>)}<span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-600">+{CSI_TEMPLATES.length - 8} more</span></div>
            </div>
            <button onClick={() => void handleFromScratch()} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Generate CSI Budget Template</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>}
    </section>
  );
}
