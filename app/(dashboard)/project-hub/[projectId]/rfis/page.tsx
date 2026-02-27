"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";

type RFI = {
  id: string;
  subject: string;
  question: string;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  ball_in_court: string | null;
  due_date: string | null;
  cost_impact: number | null;
  schedule_impact: number | null;
  distribution: string[];
  response_text: string | null;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
};

type FormData = {
  subject: string;
  question: string;
  status: string;
  priority: string;
  assigned_to: string;
  ball_in_court: string;
  due_date: string;
  cost_impact: string;
  schedule_impact: string;
  response_text: string;
};

const STATUSES = ["Open", "In Review", "Answered", "Closed"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-100 text-red-700 border-red-200",
  "In Review": "bg-amber-100 text-amber-700 border-amber-200",
  Answered: "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const EMPTY_FORM: FormData = {
  subject: "", question: "", status: "Open", priority: "Normal",
  assigned_to: "", ball_in_court: "", due_date: "",
  cost_impact: "0", schedule_impact: "0", response_text: "",
};

export default function ProjectRFIsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    if (!projectId || !form.subject.trim() || !form.question.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${projectId}/rfis`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form, cost_impact: Number(form.cost_impact) || 0, schedule_impact: Number(form.schedule_impact) || 0 }),
        });
        if (!res.ok) throw new Error("Failed");
        setToast("RFI updated");
      } else {
        const fd = new FormData();
        fd.set("subject", form.subject); fd.set("question", form.question); fd.set("status", form.status);
        if (attachment) fd.set("file", attachment);
        const res = await fetch(`/api/projects/${projectId}/rfis`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Failed");
        // Update extra fields via PATCH
        const data = await res.json();
        if (data.rfi?.id && (form.priority !== "Normal" || form.assigned_to || form.due_date || form.ball_in_court)) {
          await fetch(`/api/projects/${projectId}/rfis`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.rfi.id, priority: form.priority, assigned_to: form.assigned_to || null, ball_in_court: form.ball_in_court || null, due_date: form.due_date || null, cost_impact: Number(form.cost_impact) || 0, schedule_impact: Number(form.schedule_impact) || 0 }),
          });
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
    try {
      await fetch(`/api/projects/${projectId}/rfis`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("RFI deleted"); await load();
    } catch { setToast("Error deleting RFI"); }
  };

  const quickStatus = async (rfi: RFI, newStatus: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/rfis`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rfi.id, status: newStatus }) });
      setToast(`Marked as ${newStatus}`); await load();
    } catch { setToast("Error updating status"); }
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
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rfis-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Communication</p>
          <h2 className="text-xl font-black text-gray-900">Requests for Information</h2>
          <p className="mt-1 text-sm text-gray-500">Submit, track, and respond to RFIs with full audit trail.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setAttachment(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> New RFI</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([{ label: "Total", value: stats.total, color: "text-gray-900" }, { label: "Open", value: stats.open, color: "text-red-600" }, { label: "In Review", value: stats.review, color: "text-amber-600" }, { label: "Answered", value: stats.answered, color: "text-blue-600" }, { label: "Closed", value: stats.closed, color: "text-emerald-600" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search RFIs…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}><Filter size={14} /> Filters</button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading RFIs…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No RFIs yet</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;New RFI&quot; to submit your first request for information.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No RFIs match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => {
            const isExp = expandedId === rfi.id;
            return (
              <div key={rfi.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all">
                <button onClick={() => setExpandedId(isExp ? null : rfi.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                  <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[rfi.status] ?? "bg-gray-100 text-gray-600"}`}>{rfi.status}</span>
                  <div className="flex-1 min-w-0">
                    <span className="truncate text-sm font-semibold text-gray-900">{rfi.subject}</span>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{rfi.question}</p>
                  </div>
                  {rfi.assigned_to && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"><User size={9} /> {rfi.assigned_to}</span>}
                  {rfi.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-500"><Calendar size={9} /> {new Date(rfi.due_date).toLocaleDateString()}</span>}
                  {(rfi.cost_impact ?? 0) > 0 && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-orange-600"><DollarSign size={9} /> ${Number(rfi.cost_impact).toLocaleString()}</span>}
                  {isExp ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {([["Status", rfi.status], ["Priority", rfi.priority ?? "Normal"], ["Assigned To", rfi.assigned_to || "—"], ["Ball in Court", rfi.ball_in_court || "—"], ["Due Date", rfi.due_date ? new Date(rfi.due_date).toLocaleDateString() : "—"], ["Cost Impact", `$${Number(rfi.cost_impact ?? 0).toLocaleString()}`], ["Schedule Impact", `${rfi.schedule_impact ?? 0} days`], ["Created", new Date(rfi.created_at).toLocaleDateString()]] as [string, string][]).map(([l, v]) => (
                        <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p><p className="mt-0.5 text-sm font-semibold text-gray-900">{v}</p></div>
                      ))}
                    </div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Question</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{rfi.question}</p></div>
                    {rfi.response_text && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Response</p><p className="text-sm text-blue-800 whitespace-pre-wrap">{rfi.response_text}</p></div>}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {rfi.status !== "Closed" && <button onClick={() => quickStatus(rfi, "Closed")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">Close</button>}
                      {rfi.status === "Closed" && <button onClick={() => quickStatus(rfi, "Open")} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Reopen</button>}
                      <button onClick={() => void sendToClient(rfi.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"><Send size={12} /> Send to Client</button>
                      <button onClick={() => startEdit(rfi)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                      <button onClick={() => handleDelete(rfi.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Slide-over */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit RFI" : "New RFI"}</h3>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Subject *</label><input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Question *</label><textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Assigned To</label><input type="text" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Name or company" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Ball in Court</label><input type="text" value={form.ball_in_court} onChange={(e) => setForm({ ...form, ball_in_court: e.target.value })} placeholder="Who needs to respond" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Cost Impact ($)</label><input type="number" value={form.cost_impact} onChange={(e) => setForm({ ...form, cost_impact: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Schedule (days)</label><input type="number" value={form.schedule_impact} onChange={(e) => setForm({ ...form, schedule_impact: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              </div>
              {editingId && <div><label className="mb-1 block text-xs font-bold text-gray-700">Response</label><textarea value={form.response_text} onChange={(e) => setForm({ ...form, response_text: e.target.value })} rows={3} placeholder="Enter official response…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>}
              {!editingId && <div><label className="mb-1 block text-xs font-bold text-gray-700">Attachment</label><input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.subject.trim() || !form.question.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update RFI" : "Create RFI"}</button>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>}
    </section>
  );
}