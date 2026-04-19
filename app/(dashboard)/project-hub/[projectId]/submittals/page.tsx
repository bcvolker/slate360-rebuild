"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Download, Filter, Loader2, Plus, Search } from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import { type Submittal, type SubmittalFormData, STATUSES, DOCUMENT_TYPES, EMPTY_FORM } from "./_shared";
import SubmittalsForm from "./SubmittalsForm";
import SubmittalsListItem from "./SubmittalsListItem";

export default function ProjectSubmittalsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<SubmittalFormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDocType, setFilterDocType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<Submittal | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-submittals-${projectId}`, []);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { const res = await fetch(`/api/projects/${projectId}/submittals`, { cache: "no-store" }); const data = await res.json(); setRows(Array.isArray(data.submittals) ? data.submittals : []); }
    catch { setRows([]); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.title.toLowerCase().includes(q) || r.spec_section?.toLowerCase().includes(q) || r.responsible_contractor?.toLowerCase().includes(q) || r.document_type?.toLowerCase().includes(q) || r.document_code?.toLowerCase().includes(q) || r.stakeholder_email?.toLowerCase().includes(q)); }
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (filterDocType !== "all") list = list.filter((r) => (r.document_type ?? "Submittal") === filterDocType);
    return list;
  }, [rows, search, filterStatus, filterDocType]);

  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter((r) => r.status === "Pending" || r.status === "Submitted").length, approved: rows.filter((r) => r.status === "Approved" || r.status === "Approved as Noted").length, action: rows.filter((r) => r.status === "Revise and Resubmit" || r.status === "Rejected").length, closed: rows.filter((r) => r.status === "Closed").length }), [rows]);

  const handleSubmit = async () => {
    if (!projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${projectId}/submittals`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form, revision_number: Number(form.revision_number) || 0, lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null, amount: Number(form.amount) || 0, version_number: Number(form.version_number) || 1 }) });
        if (!res.ok) throw new Error("Failed");
        setToast("Submittal updated");
      } else {
        const fd = new FormData();
        fd.set("title", form.title); fd.set("spec_section", form.spec_section); fd.set("status", form.status);
        fd.set("document_type", form.document_type); fd.set("document_code", form.document_code);
        fd.set("stakeholder_email", form.stakeholder_email); fd.set("amount", String(Number(form.amount) || 0));
        fd.set("version_number", String(Number(form.version_number) || 1));
        if (attachment) fd.set("file", attachment);
        const res = await fetch(`/api/projects/${projectId}/submittals`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.submittal?.id && (form.due_date || form.responsible_contractor || form.required_date)) {
          await fetch(`/api/projects/${projectId}/submittals`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.submittal.id, due_date: form.due_date || null, responsible_contractor: form.responsible_contractor || null, required_date: form.required_date || null, lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null, amount: Number(form.amount) || 0, version_number: Number(form.version_number) || 1, stakeholder_email: form.stakeholder_email || null }) });
        }
        setToast("Submittal created");
      }
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); setAttachment(null); await load();
    } catch { setToast("Error saving submittal"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this submittal?")) return;
    try { await fetch(`/api/projects/${projectId}/submittals`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setToast("Submittal deleted"); await load(); }
    catch { setToast("Error deleting submittal"); }
  };

  const quickStatus = async (sub: Submittal, newStatus: string) => {
    if (!projectId) return;
    try { await fetch(`/api/projects/${projectId}/submittals`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, status: newStatus }) }); setToast(`Marked as ${newStatus}`); await load(); }
    catch { setToast("Error updating status"); }
  };

  const sendToClient = async (sub: Submittal) => {
    if (!projectId) return;
    try {
      const stakeholderEmail = window.prompt("Stakeholder email address", sub.stakeholder_email ?? "")?.trim() ?? "";
      const message = window.prompt("Optional message to include in the request email", "Please review and respond.")?.trim() ?? "";
      const res = await fetch(`/api/projects/${projectId}/external-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "Document", targetId: sub.id, expiresInDays: 14, recipientEmail: stakeholderEmail || undefined, message: message || undefined }) });
      const payload = await res.json();
      if (!res.ok || !payload.url) throw new Error(payload.error ?? "Failed");
      await navigator.clipboard.writeText(payload.url);
      setToast(payload.emailed ? "Secure response request emailed and link copied" : "Shareable link copied to clipboard");
    } catch (err) { setToast(err instanceof Error ? err.message : "Failed"); }
  };

  const saveAsCopy = async (sub: Submittal) => {
    if (!projectId) return;
    try {
      const fd = new FormData();
      fd.set("title", `${sub.title} (Copy)`); fd.set("spec_section", sub.spec_section ?? ""); fd.set("status", "Pending");
      fd.set("document_type", sub.document_type ?? "Submittal"); fd.set("document_code", sub.document_code ?? "");
      fd.set("stakeholder_email", sub.stakeholder_email ?? ""); fd.set("amount", String(Number(sub.amount ?? 0)));
      fd.set("version_number", String((sub.version_number ?? 1) + 1));
      const res = await fetch(`/api/projects/${projectId}/submittals`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed to save as copy");
      setToast("Saved as new document version"); await load();
    } catch (error) { setToast(error instanceof Error ? error.message : "Failed to save as copy"); }
  };

  const startEdit = (sub: Submittal) => {
    setForm({ title: sub.title, spec_section: sub.spec_section ?? "", document_type: sub.document_type ?? "Submittal", document_code: sub.document_code ?? "", stakeholder_email: sub.stakeholder_email ?? "", amount: String(Number(sub.amount ?? 0)), version_number: String(sub.version_number ?? 1), status: sub.status, due_date: sub.due_date ?? "", responsible_contractor: sub.responsible_contractor ?? "", revision_number: String(sub.revision_number ?? 0), lead_time_days: sub.lead_time_days ? String(sub.lead_time_days) : "", received_date: sub.received_date ?? "", required_date: sub.required_date ?? "", response_text: sub.response_text ?? "" });
    setEditingId(sub.id); setShowCreate(true);
  };

  const exportCSV = () => {
    const header = ["Title","Spec Section","Status","Rev","Responsible Contractor","Due Date","Required Date","Lead Time (days)","Response","Created"];
    const csvRows = filtered.map((r) => [r.title, r.spec_section ?? "", r.status, String(r.revision_number ?? 0), r.responsible_contractor ?? "", r.due_date ?? "", r.required_date ?? "", String(r.lead_time_days ?? ""), r.response_text ?? "", new Date(r.created_at).toLocaleDateString()]);
    const csv = [header, ...csvRows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `submittals-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Submittal Workflow</p>
          <h2 className="text-xl font-black text-white">Submittals</h2>
          <p className="mt-1 text-sm text-zinc-400">Submit, review, and track material and shop drawing approvals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"><Download size={14} /> Export</button>
          <ViewCustomizer storageKey={`viewprefs-submittals-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setAttachment(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition"><Plus size={15} /> New Submittal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([{ label: "Total", value: stats.total, color: "text-white" }, { label: "Pending", value: stats.pending, color: "text-amber-400" }, { label: "Approved", value: stats.approved, color: "text-emerald-400" }, { label: "Action Needed", value: stats.action, color: "text-red-400" }, { label: "Closed", value: stats.closed, color: "text-blue-400" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs font-semibold text-zinc-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search submittals..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}><Filter size={14} /> Filters</button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none">
              <option value="all">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Document Type</label>
            <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none">
              <option value="all">All</option>{DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading submittals...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">No submittals yet</p>
          <p className="mt-1 text-xs text-zinc-500">Click &quot;New Submittal&quot; to start tracking approvals.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">No submittals match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <SubmittalsListItem key={sub.id} sub={sub} expanded={expandedId === sub.id} onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              onQuickStatus={(s) => void quickStatus(sub, s)} onSend={() => void sendToClient(sub)} onSaveAs={() => void saveAsCopy(sub)}
              onEdit={() => startEdit(sub)} onHistory={() => setHistoryItem(sub)} onDelete={() => void handleDelete(sub.id)} />
          ))}
        </div>
      )}

      {showCreate && <SubmittalsForm form={form} setForm={setForm} editingId={editingId} saving={saving} attachment={attachment} setAttachment={setAttachment} onSubmit={() => void handleSubmit()} onClose={() => { setShowCreate(false); setEditingId(null); }} />}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-900/50 bg-emerald-950/80 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">{toast}</div>}

      <ChangeHistory open={historyItem !== null} onClose={() => setHistoryItem(null)} title={historyItem ? historyItem.title : ""} entries={historyItem ? buildBaseHistory(historyItem) : []} subfolder="Submittals" />
    </section>
  );
}
