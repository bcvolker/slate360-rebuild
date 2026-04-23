"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Download, Filter, Loader2, Plus, Search } from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import { type RFI, type RFIFormData, STATUSES, EMPTY_FORM } from "./_shared";
import RFIItem from "./RFIItem";
import RFIForm from "./RFIForm";

export default function ProjectRFIsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<RFIFormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<RFI | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-rfis-${projectId}`, []);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/rfis`, { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data.rfis) ? data.rfis : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.subject.toLowerCase().includes(q) || r.question.toLowerCase().includes(q) || r.assigned_to?.toLowerCase().includes(q)); }
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    return list;
  }, [rows, search, filterStatus]);

  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => r.status === "Open").length,
    review: rows.filter((r) => r.status === "In Review").length,
    answered: rows.filter((r) => r.status === "Answered").length,
    closed: rows.filter((r) => r.status === "Closed").length,
  }), [rows]);

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.subject.trim() || !form.question.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${projectId}/rfis`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form, cost_impact: Number(form.cost_impact) || 0, schedule_impact: Number(form.schedule_impact) || 0 }) });
        if (!res.ok) throw new Error("Failed");
        setToast("RFI updated");
      } else {
        const fd = new FormData();
        fd.set("subject", form.subject); fd.set("question", form.question); fd.set("status", form.status);
        if (attachment) fd.set("file", attachment);
        const res = await fetch(`/api/projects/${projectId}/rfis`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.rfi?.id && (form.priority !== "Normal" || form.assigned_to || form.due_date || form.ball_in_court)) {
          await fetch(`/api/projects/${projectId}/rfis`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.rfi.id, priority: form.priority, assigned_to: form.assigned_to || null, ball_in_court: form.ball_in_court || null, due_date: form.due_date || null, cost_impact: Number(form.cost_impact) || 0, schedule_impact: Number(form.schedule_impact) || 0 }) });
        }
        setToast("RFI created");
      }
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); setAttachment(null);
      await load();
    } catch { setToast("Error saving RFI"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this RFI?")) return;
    try { await fetch(`/api/projects/${projectId}/rfis`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setToast("RFI deleted"); await load(); } catch { setToast("Error deleting RFI"); }
  };

  const quickStatus = async (rfi: RFI, newStatus: string) => {
    if (!projectId) return;
    try { await fetch(`/api/projects/${projectId}/rfis`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rfi.id, status: newStatus }) }); setToast(`Marked as ${newStatus}`); await load(); } catch { setToast("Error updating status"); }
  };

  const sendToClient = async (rfiId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/external-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "RFI", targetId: rfiId, expiresInDays: 14 }) });
      const payload = await res.json();
      if (!res.ok || !payload.url) throw new Error(payload.error ?? "Failed");
      await navigator.clipboard.writeText(payload.url);
      setToast("Shareable link copied to clipboard");
    } catch (err) { setToast(err instanceof Error ? err.message : "Failed to generate link"); }
  };

  const startEdit = (rfi: RFI) => {
    setForm({ subject: rfi.subject, question: rfi.question, status: rfi.status, priority: rfi.priority ?? "Normal", assigned_to: rfi.assigned_to ?? "", ball_in_court: rfi.ball_in_court ?? "", due_date: rfi.due_date ?? "", cost_impact: String(rfi.cost_impact ?? 0), schedule_impact: String(rfi.schedule_impact ?? 0), response_text: rfi.response_text ?? "" });
    setEditingId(rfi.id); setShowCreate(true);
  };

  const exportCSV = () => {
    const header = ["Subject","Question","Status","Priority","Assigned To","Ball in Court","Due Date","Cost Impact","Schedule Impact (days)","Response","Created"];
    const csvRows = filtered.map((r) => [r.subject, r.question, r.status, r.priority ?? "", r.assigned_to ?? "", r.ball_in_court ?? "", r.due_date ?? "", String(r.cost_impact ?? 0), String(r.schedule_impact ?? 0), r.response_text ?? "", new Date(r.created_at).toLocaleDateString()]);
    const csv = [header, ...csvRows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rfis-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Project Communication</p>
          <h2 className="text-xl font-black text-foreground">Requests for Information</h2>
          <p className="mt-1 text-sm text-zinc-400">Submit, track, and respond to RFIs with full audit trail.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-card px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"><Download size={14} /> Export</button>
          <ViewCustomizer storageKey={`viewprefs-rfis-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setAttachment(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] transition"><Plus size={15} /> New RFI</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([{ label: "Total", value: stats.total, color: "text-foreground" }, { label: "Open", value: stats.open, color: "text-red-400" }, { label: "In Review", value: stats.review, color: "text-amber-400" }, { label: "Answered", value: stats.answered, color: "text-blue-400" }, { label: "Closed", value: stats.closed, color: "text-emerald-400" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-card p-4 shadow-sm"><p className="text-xs font-semibold text-zinc-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search RFIs…" className="w-full rounded-lg border border-zinc-700 bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" : "border-zinc-700 bg-card text-zinc-300 hover:bg-zinc-700"}`}><Filter size={14} /> Filters</button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-card p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-sm text-foreground outline-none">
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-card p-8 text-center text-sm text-zinc-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading RFIs…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-700 bg-card p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-400">No RFIs yet</p>
          <p className="mt-1 text-xs text-zinc-500">Click &quot;New RFI&quot; to submit your first request for information.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-card p-8 text-center text-sm text-zinc-500">No RFIs match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => (
            <RFIItem
              key={rfi.id}
              rfi={rfi}
              isExpanded={expandedId === rfi.id}
              onToggle={() => setExpandedId(expandedId === rfi.id ? null : rfi.id)}
              onQuickStatus={quickStatus}
              onSendToClient={(id) => void sendToClient(id)}
              onEdit={startEdit}
              onHistory={setHistoryItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <RFIForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          attachment={attachment}
          setAttachment={setAttachment}
          onSubmit={handleSubmit}
          onClose={() => { setShowCreate(false); setEditingId(null); }}
        />
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">{toast}</div>}

      <ChangeHistory
        open={historyItem !== null}
        onClose={() => setHistoryItem(null)}
        title={historyItem ? historyItem.subject : ""}
        entries={historyItem ? buildBaseHistory(historyItem) : []}
        subfolder="RFIs"
      />
    </section>
  );
}
