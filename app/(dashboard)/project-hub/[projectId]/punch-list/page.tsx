"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Download, Filter, Loader2, Plus, Search } from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import { type PunchItem, type PunchFormData, STATUSES, PRIORITIES, EMPTY_FORM } from "./_shared";
import PunchListItem from "./PunchListItem";
import PunchListForm from "./PunchListForm";

export default function PunchListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<PunchFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<PunchItem | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-punch-list-${projectId}`, []);

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/punch-list`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  /* ── Filtered & stats ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.assignee?.toLowerCase().includes(q) || i.location_area?.toLowerCase().includes(q) || String(i.number).includes(q));
    }
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((i) => i.priority === filterPriority);
    return list;
  }, [items, search, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    total: items.length,
    open: items.filter((i) => i.status === "Open").length,
    progress: items.filter((i) => i.status === "In Progress").length,
    review: items.filter((i) => i.status === "Ready for Review").length,
    closed: items.filter((i) => i.status === "Closed").length,
  }), [items]);

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(`/api/projects/${projectId}/punch-list`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Item updated" : "Item created");
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM);
      await load();
    } catch { setToast("Error saving item"); }
    finally { setSaving(false); }
  };

  const quickStatus = async (item: PunchItem, newStatus: PunchItem["status"]) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/punch-list`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: newStatus }) });
      setToast(`Marked as ${newStatus}`);
      await load();
    } catch { setToast("Error updating status"); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this punch item?")) return;
    try {
      await fetch(`/api/projects/${projectId}/punch-list`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Item deleted"); await load();
    } catch { setToast("Error deleting item"); }
  };

  const startEdit = (item: PunchItem) => {
    setForm({ title: item.title, description: item.description ?? "", status: item.status, priority: item.priority, assignee: item.assignee ?? "", location_area: item.location_area ?? "", trade_category: item.trade_category ?? "", due_date: item.due_date ?? "" });
    setEditingId(item.id); setShowCreate(true);
  };

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    const header = ["#","Title","Description","Status","Priority","Assignee","Location","Trade","Due Date","Created"];
    const rows = filtered.map((i) => [String(i.number), i.title, i.description ?? "", i.status, i.priority, i.assignee ?? "", i.location_area ?? "", i.trade_category ?? "", i.due_date ?? "", new Date(i.created_at).toLocaleDateString()]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `punch-list-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Punch List</p>
          <h2 className="text-xl font-black text-white">Deficiency Tracker</h2>
          <p className="mt-1 text-sm text-zinc-400">Track, assign, and close out punch items before project completion.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={items.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40">
            <Download size={14} /> Export
          </button>
          <ViewCustomizer storageKey={`viewprefs-punch-list-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition">
            <Plus size={15} /> New Item
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Open", value: stats.open, color: "text-red-400" },
          { label: "In Progress", value: stats.progress, color: "text-amber-400" },
          { label: "Review", value: stats.review, color: "text-blue-400" },
          { label: "Closed", value: stats.closed, color: "text-emerald-400" },
        ] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
          <Filter size={14} /> Filters
        </button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none">
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Priority</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none">
              <option value="all">All</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Items List ──────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading punch items…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-12 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-400">No punch items yet</p>
          <p className="mt-1 text-xs text-zinc-500">Click &quot;New Item&quot; to create your first deficiency.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">No items match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <PunchListItem
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onQuickStatus={quickStatus}
              onEdit={startEdit}
              onHistory={setHistoryItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <PunchListForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => { setShowCreate(false); setEditingId(null); }}
        />
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">{toast}</div>}

      <ChangeHistory
        open={historyItem !== null}
        onClose={() => setHistoryItem(null)}
        title={historyItem ? `#${historyItem.number} — ${historyItem.title}` : ""}
        entries={historyItem ? buildBaseHistory({ ...historyItem, completed_at: historyItem.completed_at }) : []}
        subfolder="Reports"
      />
    </section>
  );
}
