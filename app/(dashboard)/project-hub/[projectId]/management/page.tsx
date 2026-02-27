"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle, Book, Briefcase, Building2, CheckCircle2, ChevronDown, ChevronUp,
  Download, ExternalLink, FileText, FolderOpen, Loader2, Mail, MapPin,
  FileSignature, Phone, Plus, Send, Settings, Shield, Trash2, User, Users, X,
  Zap, ClipboardList, BarChart2, Calendar, Hash
} from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";

/* ─── Types ─────────────────────────────────────────────────── */
type Stakeholder = {
  id: string; name: string; role: string; company: string | null;
  email: string | null; phone: string | null; address: string | null;
  license_no: string | null; notes: string | null; status: string; created_at: string;
};
type Contract = {
  id: string; title: string; contract_type: string | null; parties: string | null;
  executed_date: string | null; contract_value: number | null; status: string;
  summary: string | null; key_requirements: string | null; file_url: string | null;
  file_upload_id: string | null;
  notes: string | null; created_at: string;
};

const ROLES = ["Owner","Architect","General Contractor","Subcontractor","Engineer","Inspector","Surveyor","Material Supplier","Legal Counsel","Other"];
const CONTRACT_TYPES = ["AIA A101 – Stipulated Sum","AIA A102 – Cost Plus GMP","AIA A104 – Abbreviated","AIA A201 – General Conditions","Subcontract","GMP Agreement","Lump Sum","Time & Material","Purchase Order","Professional Services","Other"];
const CONTRACT_STATUSES = ["Draft","Executed","Expired","Terminated","Under Review"];
const REPORT_TYPES = ["Project Status","Weekly Progress","Monthly Executive","Budget Summary","Schedule Update","Punch List","Stakeholder Summary","Closeout Report"];
const SECTIONS_OPTIONS = [
  { id: "schedule",   label: "Schedule / Gantt" },
  { id: "budget",     label: "Budget & Financials" },
  { id: "rfis",       label: "RFIs" },
  { id: "submittals", label: "Submittals & Documents" },
  { id: "daily-logs", label: "Daily Logs" },
  { id: "punch-list", label: "Punch List" },
];

const ROLE_COLORS: Record<string, string> = {
  "Owner":              "bg-blue-100 text-blue-700 border-blue-200",
  "Architect":          "bg-purple-100 text-purple-700 border-purple-200",
  "General Contractor": "bg-orange-100 text-orange-700 border-orange-200",
  "Subcontractor":      "bg-amber-100 text-amber-700 border-amber-200",
  "Engineer":           "bg-teal-100 text-teal-700 border-teal-200",
  "Inspector":          "bg-red-100 text-red-700 border-red-200",
  "Surveyor":           "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Material Supplier":  "bg-green-100 text-green-700 border-green-200",
  "Legal Counsel":      "bg-slate-100 text-slate-700 border-slate-200",
  "Other":              "bg-gray-100 text-gray-600 border-gray-200",
};
const CONTRACT_STATUS_COLORS: Record<string, string> = {
  Draft:          "bg-gray-100 text-gray-600 border-gray-200",
  Executed:       "bg-emerald-100 text-emerald-700 border-emerald-200",
  Expired:        "bg-red-100 text-red-700 border-red-200",
  Terminated:     "bg-red-100 text-red-800 border-red-300",
  "Under Review": "bg-amber-100 text-amber-700 border-amber-200",
};

const EMPTY_S_FORM = { name:"", role:"Owner", company:"", email:"", phone:"", address:"", license_no:"", notes:"", status:"Active" };
const EMPTY_C_FORM = { title:"", contract_type:"", parties:"", executed_date:"", contract_value:"", status:"Draft", notes:"" };

type Tab = "stakeholders" | "contracts" | "reports";

export default function ProjectManagementPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile, company } = useProjectProfile(projectId);

  /* ─ Stakeholders ─────────────────────────────────────────────── */
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [sLoading, setSLoading] = useState(true);
  const [showSForm, setShowSForm] = useState(false);
  const [editingSId, setEditingSId] = useState<string | null>(null);
  const [sForm, setSForm] = useState({ ...EMPTY_S_FORM });
  const [sSaving, setSSaving] = useState(false);
  const [expandedSId, setExpandedSId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");

  /* ─ Contracts ─────────────────────────────────────────────────── */
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [cLoading, setCLoading] = useState(true);
  const [showCForm, setShowCForm] = useState(false);
  const [editingCId, setEditingCId] = useState<string | null>(null);
  const [cForm, setCForm] = useState({ ...EMPTY_C_FORM });
  const [cFile, setCFile] = useState<File | null>(null);
  const [cSaving, setCSaving] = useState(false);
  const [expandedCId, setExpandedCId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  /* ─ Reports ──────────────────────────────────────────────────── */
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [reportSections, setReportSections] = useState<string[]>(["schedule","budget","rfis"]);
  const [reportTitle, setReportTitle] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<{ title: string; summary: Record<string,unknown>; fileUrl: string; fileUploadId?: string } | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("stakeholders");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  /* ─ Load Stakeholders ─────────────────────────────────────────── */
  const loadStakeholders = useCallback(async () => {
    if (!projectId) return;
    setSLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/stakeholders`, { cache: "no-store" });
      const d = await res.json();
      setStakeholders(Array.isArray(d.stakeholders) ? d.stakeholders : []);
    } catch { setStakeholders([]); } finally { setSLoading(false); }
  }, [projectId]);

  /* ─ Load Contracts ──────────────────────────────────────────── */
  const loadContracts = useCallback(async () => {
    if (!projectId) return;
    setCLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/contracts`, { cache: "no-store" });
      const d = await res.json();
      setContracts(Array.isArray(d.contracts) ? d.contracts : []);
    } catch { setContracts([]); } finally { setCLoading(false); }
  }, [projectId]);

  useEffect(() => { void loadStakeholders(); void loadContracts(); }, [loadStakeholders, loadContracts]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  /* ─ Autofill form from company profile ───────────────────────── */
  useEffect(() => {
    if (!showSForm && !editingSId) {
      setSForm((prev) => ({
        ...prev,
        company: prev.company || company.companyName,
        address: prev.address || company.companyAddress,
        email:   prev.email   || company.companyEmail,
        phone:   prev.phone   || company.companyPhone,
        license_no: prev.license_no || company.licenseNumber,
      }));
    }
  }, [showSForm, editingSId, company]);

  /* ─ Stakeholder CRUD ─────────────────────────────────────────── */
  const handleSSubmit = async () => {
    if (!projectId || !sForm.name.trim()) return;
    setSSaving(true);
    try {
      const method = editingSId ? "PATCH" : "POST";
      const body   = editingSId ? { id: editingSId, ...sForm } : sForm;
      const res = await fetch(`/api/projects/${projectId}/management/stakeholders`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editingSId ? "Stakeholder updated" : "Stakeholder added");
      setShowSForm(false); setEditingSId(null); setSForm({ ...EMPTY_S_FORM });
      await loadStakeholders();
    } catch (err) { showToast(err instanceof Error ? err.message : "Save failed"); }
    finally { setSSaving(false); }
  };

  const handleSDelete = async (id: string) => {
    if (!projectId || !confirm("Remove this stakeholder?")) return;
    await fetch(`/api/projects/${projectId}/management/stakeholders?id=${id}`, { method: "DELETE" });
    showToast("Removed"); await loadStakeholders();
  };

  const startEditS = (s: Stakeholder) => {
    setSForm({ name: s.name, role: s.role, company: s.company??"", email: s.email??"", phone: s.phone??"", address: s.address??"", license_no: s.license_no??"", notes: s.notes??"", status: s.status });
    setEditingSId(s.id); setShowSForm(true);
  };

  /* ─ Contract CRUD ───────────────────────────────────────────── */
  const handleCSubmit = async () => {
    if (!projectId || !cForm.title.trim()) return;
    setCSaving(true);
    try {
      if (editingCId) {
        const res = await fetch(`/api/projects/${projectId}/management/contracts`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingCId, ...cForm }) });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("Contract updated");
      } else {
        const fd = new FormData();
        Object.entries(cForm).forEach(([k, v]) => fd.set(k, v));
        if (cFile) fd.set("file", cFile);
        const res = await fetch(`/api/projects/${projectId}/management/contracts`, { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("Contract saved");
      }
      setShowCForm(false); setEditingCId(null); setCForm({ ...EMPTY_C_FORM }); setCFile(null);
      await loadContracts();
    } catch (err) { showToast(err instanceof Error ? err.message : "Save failed"); }
    finally { setCSaving(false); }
  };

  const handleCDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this contract?")) return;
    await fetch(`/api/projects/${projectId}/management/contracts?id=${id}`, { method: "DELETE" });
    showToast("Deleted"); await loadContracts();
  };

  const startEditC = (c: Contract) => {
    setCForm({ title: c.title, contract_type: c.contract_type??"", parties: c.parties??"", executed_date: c.executed_date??"", contract_value: c.contract_value ? String(c.contract_value) : "", status: c.status, notes: c.notes??"" });
    setEditingCId(c.id); setShowCForm(true);
  };

  /* ─ Contract analysis (server-backed) ──────────────────────────── */
  const analyzeContract = async (c: Contract) => {
    if (!projectId) return;
    setAnalyzingId(c.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/contracts/analyze`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: c.id }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Analysis failed");
      }
      showToast("Contract analyzed — requirements extracted");
      await loadContracts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Analysis failed");
    } finally { setAnalyzingId(null); }
  };

  const openContractFile = async (contract: Contract) => {
    try {
      if (contract.file_upload_id) {
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(contract.file_upload_id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to open file");
        window.open(data.url as string, "_blank", "noopener,noreferrer");
        return;
      }
      if (contract.file_url) {
        window.open(contract.file_url, "_blank", "noopener,noreferrer");
        return;
      }
      showToast("No file attached");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to open file");
    }
  };

  const openReportFile = async () => {
    if (!reportResult) return;
    try {
      if (reportResult.fileUploadId) {
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(reportResult.fileUploadId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to open report");
        window.open(data.url as string, "_blank", "noopener,noreferrer");
        return;
      }
      window.open(reportResult.fileUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to open report");
    }
  };

  /* ─ Report Generator ─────────────────────────────────────────── */
  const generateReport = async () => {
    if (!projectId) return;
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, sections: reportSections, title: reportTitle || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { report, fileUrl, fileUploadId } = await res.json();
      setReportResult({ title: report.title, summary: report.summary as Record<string,unknown>, fileUrl, fileUploadId });
      showToast("Report generated successfully");
    } catch (err) { showToast(err instanceof Error ? err.message : "Report generation failed"); }
    finally { setGeneratingReport(false); }
  };

  /* ─ Derived ──────────────────────────────────────────────────── */
  const filteredStakeholders = useMemo(() =>
    roleFilter === "all" ? stakeholders : stakeholders.filter((s) => s.role === roleFilter),
  [stakeholders, roleFilter]);

  const roleGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    stakeholders.forEach((s) => { groups[s.role] = (groups[s.role] ?? 0) + 1; });
    return groups;
  }, [stakeholders]);

  if (!projectId) return null;

  const TAB_DEF: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "stakeholders", label: "Stakeholders",  icon: Users,          count: stakeholders.length },
    { id: "contracts",    label: "Contracts",      icon: FileSignature,  count: contracts.length },
    { id: "reports",      label: "Reports",        icon: BarChart2 },
  ];

  return (
    <section className="space-y-6">
      {/* ── Page header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Management</p>
          <h2 className="text-xl font-black text-gray-900">Team & Contract Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage stakeholders, contracts, document summaries, and generate professional reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/project-hub/${projectId}/slatedrop`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <FolderOpen size={14} /> Project Files
          </Link>
          <Link href={`/project-hub/${projectId}/submittals`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
            <FileText size={14} /> AIA Documents
          </Link>
        </div>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Stakeholders", value: stakeholders.length,  color: "text-[#1E3A8A]",  icon: Users },
          { label: "Active Contracts",   value: contracts.filter((c)=>c.status==="Executed").length, color: "text-emerald-600", icon: FileSignature },
          { label: "Contracts Drafted",  value: contracts.filter((c)=>c.status==="Draft").length, color: "text-amber-600",   icon: FileText },
          { label: "Subcontractors",     value: stakeholders.filter((s)=>s.role==="Subcontractor").length, color: "text-orange-600", icon: Building2 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <s.icon size={14} className={s.color} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-0">
        {TAB_DEF.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={["inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors", activeTab === t.id ? "border-[#FF4D00] text-[#FF4D00]" : "border-transparent text-gray-500 hover:text-gray-700"].join(" ")}
          >
            <t.icon size={14} />
            {t.label}
            {t.count !== undefined && (
              <span className={["rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none", activeTab === t.id ? "bg-[#FF4D00]/10 text-[#FF4D00]" : "bg-gray-100 text-gray-500"].join(" ")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════ STAKEHOLDERS TAB ═══════════════════════ */}
      {activeTab === "stakeholders" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left: List ── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRoleFilter("all")} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${roleFilter==="all" ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  All ({stakeholders.length})
                </button>
                {Object.entries(roleGroups).map(([role, count]) => (
                  <button key={role} onClick={() => setRoleFilter(role)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${roleFilter===role ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {role} ({count})
                  </button>
                ))}
              </div>
              <button onClick={() => { setSForm({ ...EMPTY_S_FORM }); setEditingSId(null); setShowSForm(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
                <Plus size={15} /> Add Stakeholder
              </button>
            </div>

            {sLoading ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading…</div>
            ) : stakeholders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <Users size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No stakeholders yet</p>
                <p className="mt-1 text-xs text-gray-400">Add owners, architects, contractors, and subcontractors.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStakeholders.map((s) => {
                  const isExp = expandedSId === s.id;
                  return (
                    <div key={s.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <button onClick={() => setExpandedSId(isExp ? null : s.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                        <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                          <User size={16} className="text-[#1E3A8A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.company ?? s.email ?? "—"}</p>
                        </div>
                        <span className={`hidden sm:inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[s.role] ?? ROLE_COLORS.Other}`}>{s.role}</span>
                        {s.status === "Inactive" && <span className="hidden sm:inline-flex shrink-0 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Inactive</span>}
                        {isExp ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                      </button>
                      {isExp && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {([["Role", s.role], ["Company", s.company], ["Email", s.email], ["Phone", s.phone], ["Address", s.address], ["License #", s.license_no]] as [string, string|null][]).filter(([,v]) => v).map(([l,v]) => (
                              <div key={l}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                                <p className="mt-0.5 text-xs font-semibold text-gray-800 break-all">{v}</p>
                              </div>
                            ))}
                          </div>
                          {s.notes && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">{s.notes}</div>}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {s.email && (
                              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                                <Mail size={12} /> Email
                              </a>
                            )}
                            {s.phone && (
                              <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                                <Phone size={12} /> Call
                              </a>
                            )}
                            <button onClick={() => startEditS(s)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                              Edit
                            </button>
                            <button onClick={() => handleSDelete(s.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto">
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Add/Edit form ── */}
          <div className="xl:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">{editingSId ? "Edit Stakeholder" : "Add Stakeholder"}</h3>
                {showSForm && (
                  <button onClick={() => { setShowSForm(false); setEditingSId(null); setSForm({ ...EMPTY_S_FORM }); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={15} /></button>
                )}
              </div>
              {!showSForm ? (
                <div className="p-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
                    <Users size={20} className="text-[#1E3A8A]" />
                  </div>
                  <p className="text-xs text-gray-500">Add owners, architects, GCs, subs, engineers, or any project stakeholder.</p>
                  <button onClick={() => { setSForm({ ...EMPTY_S_FORM }); setEditingSId(null); setShowSForm(true); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#162d6e] transition">
                    <Plus size={14} /> Add Stakeholder
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Name *</label>
                    <input value={sForm.name} onChange={(e) => setSForm({...sForm, name: e.target.value})} placeholder="Full name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Role *</label>
                      <select value={sForm.role} onChange={(e) => setSForm({...sForm, role: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]">
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                      <select value={sForm.status} onChange={(e) => setSForm({...sForm, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Company</label>
                    <input value={sForm.company} onChange={(e) => setSForm({...sForm, company: e.target.value})} placeholder="Company name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700"><Mail size={10} className="inline mr-1" />Email</label>
                      <input type="email" value={sForm.email} onChange={(e) => setSForm({...sForm, email: e.target.value})} placeholder="email@co.com" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700"><Phone size={10} className="inline mr-1" />Phone</label>
                      <input type="tel" value={sForm.phone} onChange={(e) => setSForm({...sForm, phone: e.target.value})} placeholder="(555) 000-0000" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700"><MapPin size={10} className="inline mr-1" />Address</label>
                    <input value={sForm.address} onChange={(e) => setSForm({...sForm, address: e.target.value})} placeholder="123 Main St, City, ST" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700"><Hash size={10} className="inline mr-1" />License / Cert #</label>
                    <input value={sForm.license_no} onChange={(e) => setSForm({...sForm, license_no: e.target.value})} placeholder="GC-12345" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Notes</label>
                    <textarea value={sForm.notes} onChange={(e) => setSForm({...sForm, notes: e.target.value})} rows={2} placeholder="Scope, specialty, payment terms…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] resize-none" />
                  </div>
                  <button onClick={handleSSubmit} disabled={sSaving || !sForm.name.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#162d6e] disabled:opacity-50 transition">
                    {sSaving && <Loader2 size={14} className="animate-spin" />}
                    {editingSId ? "Update" : "Add Stakeholder"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CONTRACTS TAB ══════════════════════════ */}
      {activeTab === "contracts" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left: List ── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">{contracts.length} contract{contracts.length !== 1 ? "s" : ""}</p>
              <button onClick={() => { setCForm({ ...EMPTY_C_FORM }); setEditingCId(null); setShowCForm(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
                <Plus size={15} /> Upload Contract
              </button>
            </div>

            {cLoading ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading…</div>
            ) : contracts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <FileSignature size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No contracts yet</p>
                <p className="mt-1 text-xs text-gray-400">Upload contracts to extract requirements and track execution status.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const isExp = expandedCId === c.id;
                  let parsedReqs: string[] = [];
                  try { parsedReqs = JSON.parse(c.key_requirements ?? "[]") as string[]; } catch { /* ignore */ }
                  return (
                    <div key={c.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <button onClick={() => setExpandedCId(isExp ? null : c.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                          <FileSignature size={16} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{c.title}</p>
                          <p className="text-xs text-gray-500 truncate">{c.contract_type ?? "Contract"}{c.parties ? ` · ${c.parties}` : ""}</p>
                        </div>
                        {c.contract_value && <span className="hidden sm:block shrink-0 text-xs font-bold text-gray-700">${Number(c.contract_value).toLocaleString()}</span>}
                        <span className={`hidden sm:inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${CONTRACT_STATUS_COLORS[c.status] ?? CONTRACT_STATUS_COLORS.Draft}`}>{c.status}</span>
                        {isExp ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                      </button>
                      {isExp && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {([["Type", c.contract_type], ["Status", c.status], ["Parties", c.parties], ["Value", c.contract_value ? `$${Number(c.contract_value).toLocaleString()}` : null], ["Executed", c.executed_date ? new Date(c.executed_date).toLocaleDateString() : null], ["Uploaded", new Date(c.created_at).toLocaleDateString()]] as [string, string|null][]).filter(([,v]) => v).map(([l,v]) => (
                              <div key={l}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                                <p className="mt-0.5 text-xs font-semibold text-gray-800">{v}</p>
                              </div>
                            ))}
                          </div>

                          {/* AI Summary */}
                          {c.summary ? (
                            <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Zap size={12} className="text-purple-600" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">AI Summary</p>
                              </div>
                              <p className="text-xs text-purple-900 leading-relaxed">{c.summary}</p>
                            </div>
                          ) : null}

                          {/* Key requirements */}
                          {parsedReqs.length > 0 && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Shield size={12} className="text-blue-600" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Key Contractual Requirements</p>
                              </div>
                              <ul className="space-y-1">
                                {parsedReqs.map((req, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-blue-900">
                                    <CheckCircle2 size={11} className="text-blue-400 mt-0.5 shrink-0" />
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {(c.file_upload_id || c.file_url) && (
                              <button
                                onClick={() => void openContractFile(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                              >
                                <Download size={12} /> Download
                              </button>
                            )}
                            {!c.summary && (
                              <button onClick={() => void analyzeContract(c)} disabled={analyzingId === c.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition disabled:opacity-50">
                                {analyzingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                {analyzingId === c.id ? "Analyzing…" : "AI Analyze"}
                              </button>
                            )}
                            <button onClick={() => startEditC(c)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                            <button onClick={() => handleCDelete(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Upload/Edit form ── */}
          <div className="xl:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">{editingCId ? "Edit Contract" : "Upload Contract"}</h3>
                {showCForm && (
                  <button onClick={() => { setShowCForm(false); setEditingCId(null); setCForm({ ...EMPTY_C_FORM }); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={15} /></button>
                )}
              </div>
              {!showCForm ? (
                <div className="p-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                    <FileSignature size={20} className="text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-500">Upload AIA contracts, subcontracts, or any project agreement. AI extracts key requirements in plain English.</p>
                  <button onClick={() => { setCForm({ ...EMPTY_C_FORM }); setEditingCId(null); setShowCForm(true); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] transition">
                    <Plus size={14} /> Upload Contract
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Title *</label>
                    <input value={cForm.title} onChange={(e) => setCForm({...cForm, title: e.target.value})} placeholder="e.g. Prime Contract – Phase 1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Contract Type</label>
                      <select value={cForm.contract_type} onChange={(e) => setCForm({...cForm, contract_type: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]">
                        <option value="">Select…</option>
                        {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                      <select value={cForm.status} onChange={(e) => setCForm({...cForm, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]">
                        {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Parties</label>
                    <input value={cForm.parties} onChange={(e) => setCForm({...cForm, parties: e.target.value})} placeholder="Owner, GC – separate by comma" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Contract Value ($)</label>
                      <input type="number" value={cForm.contract_value} onChange={(e) => setCForm({...cForm, contract_value: e.target.value})} placeholder="0" min="0" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Executed Date</label>
                      <input type="date" value={cForm.executed_date} onChange={(e) => setCForm({...cForm, executed_date: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                    </div>
                  </div>
                  {!editingCId && (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Contract File (PDF, DOCX)</label>
                      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setCFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Notes</label>
                    <textarea value={cForm.notes} onChange={(e) => setCForm({...cForm, notes: e.target.value})} rows={2} placeholder="Scope notes, amendments…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] resize-none" />
                  </div>
                  <button onClick={handleCSubmit} disabled={cSaving || !cForm.title.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                    {cSaving && <Loader2 size={14} className="animate-spin" />}
                    {editingCId ? "Update Contract" : "Save Contract"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ REPORTS TAB ════════════════════════════ */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left: Report Config ── */}
          <div className="xl:col-span-1 space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-4">Generate Professional Report</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Report Type</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]">
                      {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">Custom Title (optional)</label>
                    <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder={`${profile.projectName ? profile.projectName + " — " : ""}${reportType} Report`} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">Include Sections</label>
                    <div className="space-y-2">
                      {SECTIONS_OPTIONS.map((s) => (
                        <label key={s.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={reportSections.includes(s.id)} onChange={(e) => setReportSections(e.target.checked ? [...reportSections, s.id] : reportSections.filter((r) => r !== s.id))} className="h-4 w-4 rounded border-gray-300 accent-[#FF4D00]" />
                          <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={generateReport} disabled={generatingReport || reportSections.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                    {generatingReport ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><BarChart2 size={14} /> Generate Report</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Book size={14} className="text-blue-600" />
                <p className="text-xs font-black text-blue-800">What gets included</p>
              </div>
              <ul className="space-y-1.5">
                {[
                  "Live project stats & completion %",
                  "Budget vs. actuals with variance",
                  "RFI & submittal status summary",
                  "Task schedule progress",
                  "Daily log recap",
                  "Open punch list items",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-[11px] text-blue-700">
                    <CheckCircle2 size={10} className="text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Right: Preview ── */}
          <div className="xl:col-span-2">
            {!reportResult ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
                <BarChart2 size={40} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">Report preview will appear here</p>
                <p className="text-xs text-gray-400 max-w-xs text-center">Select report type and sections, then click Generate to compile a professional report from live project data.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="bg-[#1E3A8A] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">Slate360 Professional Report</p>
                  <h3 className="text-lg font-black text-white">{reportResult.title}</h3>
                  <p className="text-[11px] text-blue-200 mt-1">Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Executive Summary */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Executive Summary</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {Object.entries(reportResult.summary).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{key.replace(/([A-Z])/g," $1").replace(/^./,(s)=>s.toUpperCase())}</p>
                          <p className="text-xs font-bold text-gray-900 mt-0.5">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Download */}
                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Report saved to project S3 archive</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void openReportFile()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                        <Download size={12} /> Download JSON
                      </button>
                      <button onClick={() => setReportResult(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                        New Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
