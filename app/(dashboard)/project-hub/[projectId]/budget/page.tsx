"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  DollarSign, Download, FileText, Filter, Loader2, Plus, Save, Search,
  TrendingDown, TrendingUp, X,
} from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import {
  type BudgetRow, type BudgetFormData, CATEGORIES, CSI_TEMPLATES, EMPTY_FORM, fmtCurrency,
} from "./_shared";
import BudgetForm from "./BudgetForm";
import BudgetTable from "./BudgetTable";

export default function ProjectBudgetPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile } = useProjectProfile(projectId);

  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showFromScratch, setShowFromScratch] = useState(false);
  const [scratchName, setScratchName] = useState("");
  const [historyItem, setHistoryItem] = useState<BudgetRow | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-budget-${projectId}`, ["cost_code","description","category","budget","revised","spent","variance"]);

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
    for (const r of rows) { const cat = r.category ?? "Uncategorized"; if (!map[cat]) map[cat] = { budget: 0, spent: 0 }; map[cat].budget += Number(r.budget_amount ?? 0); map[cat].spent += Number(r.spent_amount ?? 0); }
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
    const csvRows = [["Cost Code","Description","Category","Original Budget","Change Orders","Revised Budget","Spent","Forecast","Variance","Notes"], ...filtered.map((r) => { const b = Number(r.budget_amount ?? 0), co = Number(r.change_order_amount ?? 0), s = Number(r.spent_amount ?? 0); return [r.cost_code, r.description ?? "", r.category ?? "", b.toFixed(2), co.toFixed(2), (b+co).toFixed(2), s.toFixed(2), (Number(r.forecast_amount ?? 0)).toFixed(2), (b+co-s).toFixed(2), r.notes ?? ""]; })];
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
      for (const item of items) { await fetch(`/api/projects/${projectId}/budget`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }); }
      setToast("Budget template created with CSI divisions"); setShowFromScratch(false); setScratchName(""); await load();
    } catch { setToast("Error creating template"); } finally { setSaving(false); }
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Financials</p>
          <h2 className="text-xl font-black text-foreground">Budget & Cost Control{profile.projectName && <span className="ml-2 text-base font-semibold text-zinc-500">— {profile.projectName}</span>}</h2>
          <p className="mt-1 text-sm text-zinc-400">Track original budget, change orders, spend, and forecasts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFromScratch(true)} disabled={rows.length > 0} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-600 bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition" title="Start a fresh budget from CSI template"><FileText size={14} /> New Budget</button>
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-card px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-card disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-card px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-card disabled:opacity-40">{snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot</button>
          <ViewCustomizer storageKey={`viewprefs-budget-${projectId}`} cols={[{key:"cost_code",label:"Cost Code"},{key:"description",label:"Description"},{key:"category",label:"Category"},{key:"budget",label:"Budget"},{key:"revised",label:"Revised"},{key:"spent",label:"Spent"},{key:"variance",label:"Variance"}]} defaultCols={["cost_code","description","category","budget","revised","spent","variance"]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Original Budget", value: fmtCurrency(totals.budget), icon: DollarSign, color: "text-foreground" },
          { label: "Change Orders", value: fmtCurrency(totals.changeOrders), icon: Plus, color: totals.changeOrders > 0 ? "text-amber-400" : "text-foreground" },
          { label: "Revised Budget", value: fmtCurrency(revisedBudget), icon: DollarSign, color: "text-blue-400" },
          { label: "Spent to Date", value: fmtCurrency(totals.spent), icon: TrendingDown, color: "text-foreground" },
          { label: "Variance", value: fmtCurrency(variance), icon: variance >= 0 ? TrendingUp : TrendingDown, color: variance >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "% Spent", value: `${pctSpent}%`, icon: DollarSign, color: pctSpent > 90 ? "text-red-400" : "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-1 mb-1"><s.icon size={11} className="text-zinc-500" /><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{s.label}</p></div>
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cost codes…" className="w-full rounded-lg border border-zinc-700 bg-card py-2 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#3B82F6]" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" : "border-zinc-700 bg-card text-zinc-300 hover:bg-card"}`}><Filter size={13} /> Filters</button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-card p-4">
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Category</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-sm text-zinc-200 outline-none"><option value="all">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      )}

      {/* Split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-card shadow-sm">
          <BudgetTable rows={rows} filtered={filtered} loading={loading} editingId={editingId} totals={totals} revisedBudget={revisedBudget} variance={variance} onEdit={startEdit} onHistory={setHistoryItem} onDelete={(id) => void handleDelete(id)} />
        </div>
        <div className="xl:sticky xl:top-4">
          <BudgetForm form={form} setForm={setForm} editingId={editingId} saving={saving} rows={rows} totals={totals} revisedBudget={revisedBudget} variance={variance} pctSpent={pctSpent} categoryBreakdown={categoryBreakdown} onSubmit={handleSubmit} onDelete={(id) => void handleDelete(id)} onCancelEdit={() => { setEditingId(null); setForm(EMPTY_FORM); }} />
        </div>
      </div>

      {/* From-scratch modal */}
      {showFromScratch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFromScratch(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-zinc-800 shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground">New Budget from Scratch</h3>
              <button onClick={() => setShowFromScratch(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-card"><X size={18} /></button>
            </div>
            <p className="text-sm text-zinc-400">This will pre-populate all standard CSI division codes (01–16) with $0 budget amounts. You can then fill in the actual values.</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">Project Name</label>
              <input type="text" value={scratchName || profile.projectName} onChange={(e) => setScratchName(e.target.value)} placeholder={profile.projectName || "Enter project name…"} className="w-full rounded-lg border border-zinc-700 bg-card px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#3B82F6]" />
            </div>
            <div className="rounded-xl bg-blue-950/30 border border-blue-900/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Will create {CSI_TEMPLATES.length} line items</p>
              <div className="flex flex-wrap gap-1">{CSI_TEMPLATES.slice(0, 8).map((t) => <span key={t.costCode} className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-300">{t.costCode}</span>)}<span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-300">+{CSI_TEMPLATES.length - 8} more</span></div>
            </div>
            <button onClick={() => void handleFromScratch()} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] disabled:opacity-50 transition">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Generate CSI Budget Template</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-800 bg-emerald-950/80 px-4 py-2 text-sm font-medium text-emerald-300 shadow-lg">{toast}</div>}

      <ChangeHistory open={historyItem !== null} onClose={() => setHistoryItem(null)} title={historyItem ? `${historyItem.cost_code} — ${historyItem.description ?? ""}` : ""} entries={historyItem ? buildBaseHistory(historyItem) : []} subfolder="Budget" />
    </section>
  );
}
