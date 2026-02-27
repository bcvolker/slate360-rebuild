"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
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

type Submittal = {
  id: string;
  title: string;
  spec_section: string | null;
  status: string;
  due_date: string | null;
  responsible_contractor: string | null;
  revision_number: number | null;
  lead_time_days: number | null;
  received_date: string | null;
  required_date: string | null;
  response_text: string | null;
  document_type: string | null;
  document_code: string | null;
  stakeholder_email: string | null;
  amount: number | null;
  version_number: number | null;
  sent_at: string | null;
  last_response_at: string | null;
  response_decision: string | null;
  created_at: string;
  updated_at: string | null;
};

type FormData = {
  title: string;
  spec_section: string;
  document_type: string;
  document_code: string;
  stakeholder_email: string;
  amount: string;
  version_number: string;
  status: string;
  due_date: string;
  responsible_contractor: string;
  revision_number: string;
  lead_time_days: string;
  received_date: string;
  required_date: string;
  response_text: string;
};

const DOCUMENT_TYPES = [
  "Submittal",
  "Invoice",
  "Schedule of Values (SOV)",
  "Pay Application",
  "Change Order",
  "Lien Waiver",
  "AIA Contract",
  "AIA Payment Form",
  "AIA Admin Form",
  "Other",
] as const;

const DOCUMENT_CODE_OPTIONS = [
  "",
  "G701 – Change Order",
  "G702 – Application & Certificate for Payment",
  "G703 – Continuation Sheet / SOV",
  "G704 – Certificate of Substantial Completion",
  "G706 – Affidavit of Payment of Debts and Claims",
  "G706A – Affidavit of Release of Liens",
  "G707 – Consent of Surety to Final Payment",
  "G710 – Supplemental Instructions",
  "G716 – Request for Information",
  "A101 – Owner/Contractor Agreement (Stipulated Sum)",
  "A102 – Owner/Contractor Agreement (Cost Plus GMP)",
  "A201 – General Conditions",
  "Custom",
] as const;

const STATUSES = ["Pending", "Submitted", "Approved", "Approved as Noted", "Revise and Resubmit", "Rejected", "Closed"];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-700 border-gray-200",
  Submitted: "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Approved as Noted": "bg-green-100 text-green-700 border-green-200",
  "Revise and Resubmit": "bg-orange-100 text-orange-700 border-orange-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Closed: "bg-blue-100 text-blue-700 border-blue-200",
};

const EMPTY_FORM: FormData = {
  title: "", spec_section: "", document_type: "Submittal", document_code: "", stakeholder_email: "", amount: "0", version_number: "1", status: "Pending", due_date: "",
  responsible_contractor: "", revision_number: "0", lead_time_days: "",
  received_date: "", required_date: "", response_text: "",
};

export default function ProjectSubmittalsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDocType, setFilterDocType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/submittals`, { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data.submittals) ? data.submittals : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
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

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === "Pending" || r.status === "Submitted").length,
    approved: rows.filter((r) => r.status === "Approved" || r.status === "Approved as Noted").length,
    action: rows.filter((r) => r.status === "Revise and Resubmit" || r.status === "Rejected").length,
    closed: rows.filter((r) => r.status === "Closed").length,
  }), [rows]);

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
        fd.set("document_type", form.document_type);
        fd.set("document_code", form.document_code);
        fd.set("stakeholder_email", form.stakeholder_email);
        fd.set("amount", String(Number(form.amount) || 0));
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
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); setAttachment(null);
      await load();
    } catch { setToast("Error saving submittal"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this submittal?")) return;
    try {
      await fetch(`/api/projects/${projectId}/submittals`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Submittal deleted"); await load();
    } catch { setToast("Error deleting submittal"); }
  };

  const quickStatus = async (sub: Submittal, newStatus: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/submittals`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, status: newStatus }) });
      setToast(`Marked as ${newStatus}`); await load();
    } catch { setToast("Error updating status"); }
  };

  const sendToClient = async (sub: Submittal) => {
    if (!projectId) return;
    try {
      const stakeholderEmail = window.prompt("Stakeholder email address", sub.stakeholder_email ?? "")?.trim() ?? "";
      const message = window.prompt("Optional message to include in the request email", "Please review and respond.")?.trim() ?? "";
      const res = await fetch(`/api/projects/${projectId}/external-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "Document",
          targetId: sub.id,
          expiresInDays: 14,
          recipientEmail: stakeholderEmail || undefined,
          message: message || undefined,
        }),
      });
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
      fd.set("title", `${sub.title} (Copy)`);
      fd.set("spec_section", sub.spec_section ?? "");
      fd.set("status", "Pending");
      fd.set("document_type", sub.document_type ?? "Submittal");
      fd.set("document_code", sub.document_code ?? "");
      fd.set("stakeholder_email", sub.stakeholder_email ?? "");
      fd.set("amount", String(Number(sub.amount ?? 0)));
      fd.set("version_number", String((sub.version_number ?? 1) + 1));
      const res = await fetch(`/api/projects/${projectId}/submittals`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed to save as copy");
      setToast("Saved as new document version");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to save as copy");
    }
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

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Submittal Workflow</p>
          <h2 className="text-xl font-black text-gray-900">Submittals</h2>
          <p className="mt-1 text-sm text-gray-500">Submit, review, and track material and shop drawing approvals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setAttachment(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> New Submittal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([{ label: "Total", value: stats.total, color: "text-gray-900" }, { label: "Pending", value: stats.pending, color: "text-amber-600" }, { label: "Approved", value: stats.approved, color: "text-emerald-600" }, { label: "Action Needed", value: stats.action, color: "text-red-600" }, { label: "Closed", value: stats.closed, color: "text-blue-600" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search submittals…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
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
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Document Type</label>
            <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading submittals…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No submittals yet</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;New Submittal&quot; to start tracking approvals.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No submittals match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const isExp = expandedId === sub.id;
            return (
              <div key={sub.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all">
                <button onClick={() => setExpandedId(isExp ? null : sub.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                  <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[sub.status] ?? "bg-gray-100 text-gray-600"}`}>{sub.status}</span>
                  <div className="flex-1 min-w-0">
                    <span className="truncate text-sm font-semibold text-gray-900">{sub.title}</span>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {sub.document_type ?? "Submittal"}
                      {sub.document_code ? ` · ${sub.document_code}` : ""}
                      {sub.spec_section ? ` · Spec: ${sub.spec_section}` : ""}
                    </p>
                  </div>
                  {(sub.revision_number ?? 0) > 0 && <span className="hidden sm:inline-flex shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">Rev {sub.revision_number}</span>}
                  {sub.responsible_contractor && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"><User size={9} /> {sub.responsible_contractor}</span>}
                  {sub.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-500"><Calendar size={9} /> {new Date(sub.due_date).toLocaleDateString()}</span>}
                  {isExp ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {([ ["Type", sub.document_type || "Submittal"], ["Doc Code", sub.document_code || "—"], ["Amount", sub.amount ? `$${Number(sub.amount).toLocaleString()}` : "—"], ["Version", String(sub.version_number ?? 1)], ["Status", sub.status], ["Spec Section", sub.spec_section || "—"], ["Revision", String(sub.revision_number ?? 0)], ["Contractor", sub.responsible_contractor || "—"], ["Due Date", sub.due_date ? new Date(sub.due_date).toLocaleDateString() : "—"], ["Required Date", sub.required_date ? new Date(sub.required_date).toLocaleDateString() : "—"], ["Lead Time", sub.lead_time_days ? `${sub.lead_time_days} days` : "—"], ["Sent", sub.sent_at ? new Date(sub.sent_at).toLocaleString() : "—"], ["Response", sub.last_response_at ? new Date(sub.last_response_at).toLocaleString() : "—"], ["Stakeholder", sub.stakeholder_email || "—"], ["Created", new Date(sub.created_at).toLocaleDateString()]] as [string, string][]).map(([l, v]) => (
                        <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p><p className="mt-0.5 text-sm font-semibold text-gray-900">{v}</p></div>
                      ))}
                    </div>
                    {sub.response_text && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Response / Notes</p><p className="text-sm text-blue-800 whitespace-pre-wrap">{sub.response_text}</p></div>}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {sub.status !== "Approved" && sub.status !== "Closed" && <button onClick={() => quickStatus(sub, "Approved")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">Approve</button>}
                      {sub.status !== "Closed" && <button onClick={() => quickStatus(sub, "Closed")} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">Close</button>}
                      <button onClick={() => void sendToClient(sub)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"><Send size={12} /> Send</button>
                      <button onClick={() => void saveAsCopy(sub)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Save As</button>
                      <button onClick={() => startEdit(sub)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                      <button onClick={() => handleDelete(sub.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Delete</button>
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
              <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Submittal" : "New Submittal"}</h3>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Document Type</label>
                  <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">AIA / Form Code</label>
                  <input
                    list="document-code-options"
                    value={form.document_code}
                    onChange={(e) => setForm({ ...form, document_code: e.target.value })}
                    placeholder="Select or type"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30"
                  />
                  <datalist id="document-code-options">
                    {DOCUMENT_CODE_OPTIONS.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Spec Section</label><input type="text" value={form.spec_section} onChange={(e) => setForm({ ...form, spec_section: e.target.value })} placeholder="e.g. 03 30 00" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Amount ($)</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Version</label><input type="number" value={form.version_number} onChange={(e) => setForm({ ...form, version_number: e.target.value })} min="1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Stakeholder Email</label><input type="email" value={form.stakeholder_email} onChange={(e) => setForm({ ...form, stakeholder_email: e.target.value })} placeholder="client@company.com" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Responsible Contractor</label><input type="text" value={form.responsible_contractor} onChange={(e) => setForm({ ...form, responsible_contractor: e.target.value })} placeholder="Company name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Revision #</label><input type="number" value={form.revision_number} onChange={(e) => setForm({ ...form, revision_number: e.target.value })} min="0" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Required Date</label><input type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              </div>
              {editingId && <div><label className="mb-1 block text-xs font-bold text-gray-700">Response / Notes</label><textarea value={form.response_text} onChange={(e) => setForm({ ...form, response_text: e.target.value })} rows={3} placeholder="Enter response or review notes…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>}
              {!editingId && <div><label className="mb-1 block text-xs font-bold text-gray-700">Attachment</label><input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update Submittal" : "Create Submittal"}</button>
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