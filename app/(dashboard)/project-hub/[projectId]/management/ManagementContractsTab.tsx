"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, Download, FileSignature, Loader2,
  Plus, Shield, Trash2, X, Zap,
} from "lucide-react";
import { type Contract, CONTRACT_TYPES, CONTRACT_STATUSES, CONTRACT_STATUS_COLORS, EMPTY_C_FORM } from "./_shared";

interface Props {
  projectId: string;
  showToast: (msg: string) => void;
  onStatsChange: (total: number, executed: number, drafted: number) => void;
}

export default function ManagementContractsTab({ projectId, showToast, onStatsChange }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [cLoading, setCLoading] = useState(true);
  const [showCForm, setShowCForm] = useState(false);
  const [editingCId, setEditingCId] = useState<string | null>(null);
  const [cForm, setCForm] = useState({ ...EMPTY_C_FORM });
  const [cFile, setCFile] = useState<File | null>(null);
  const [cSaving, setCSaving] = useState(false);
  const [expandedCId, setExpandedCId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setCLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/contracts`, { cache: "no-store" });
      const d = await res.json();
      const list: Contract[] = Array.isArray(d.contracts) ? d.contracts : [];
      setContracts(list);
      onStatsChange(list.length, list.filter((c) => c.status === "Executed").length, list.filter((c) => c.status === "Draft").length);
    } catch { setContracts([]); onStatsChange(0, 0, 0); }
    finally { setCLoading(false); }
  }, [projectId, onStatsChange]);

  useEffect(() => { void loadContracts(); }, [loadContracts]);

  const handleCSubmit = async () => {
    if (!cForm.title.trim()) return;
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
    if (!confirm("Delete this contract?")) return;
    await fetch(`/api/projects/${projectId}/management/contracts?id=${id}`, { method: "DELETE" });
    showToast("Deleted"); await loadContracts();
  };

  const startEditC = (c: Contract) => {
    setCForm({ title: c.title, contract_type: c.contract_type ?? "", parties: c.parties ?? "", executed_date: c.executed_date ?? "", contract_value: c.contract_value ? String(c.contract_value) : "", status: c.status, notes: c.notes ?? "" });
    setEditingCId(c.id); setShowCForm(true);
  };

  const analyzeContract = async (c: Contract) => {
    setAnalyzingId(c.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/contracts/analyze`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: c.id }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Analysis failed");
      }
      showToast("Contract analyzed — requirements extracted");
      await loadContracts();
    } catch (err) { showToast(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setAnalyzingId(null); }
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
      if (contract.file_url) { window.open(contract.file_url, "_blank", "noopener,noreferrer"); return; }
      showToast("No file attached");
    } catch (err) { showToast(err instanceof Error ? err.message : "Unable to open file"); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── Left: List ── */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-600">{contracts.length} contract{contracts.length !== 1 ? "s" : ""}</p>
          <button onClick={() => { setCForm({ ...EMPTY_C_FORM }); setEditingCId(null); setShowCForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] transition">
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
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0"><FileSignature size={16} className="text-purple-600" /></div>
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
                        {([["Type", c.contract_type], ["Status", c.status], ["Parties", c.parties], ["Value", c.contract_value ? `$${Number(c.contract_value).toLocaleString()}` : null], ["Executed", c.executed_date ? new Date(c.executed_date).toLocaleDateString() : null], ["Uploaded", new Date(c.created_at).toLocaleDateString()]] as [string, string | null][]).filter(([, v]) => v).map(([l, v]) => (
                          <div key={l}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                            <p className="mt-0.5 text-xs font-semibold text-gray-800">{v}</p>
                          </div>
                        ))}
                      </div>
                      {c.summary && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 space-y-2">
                          <div className="flex items-center gap-1.5"><Zap size={12} className="text-purple-600" /><p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">AI Summary</p></div>
                          <p className="text-xs text-purple-900 leading-relaxed">{c.summary}</p>
                        </div>
                      )}
                      {parsedReqs.length > 0 && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
                          <div className="flex items-center gap-1.5"><Shield size={12} className="text-blue-600" /><p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Key Contractual Requirements</p></div>
                          <ul className="space-y-1">
                            {parsedReqs.map((req, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-blue-900"><CheckCircle2 size={11} className="text-blue-400 mt-0.5 shrink-0" />{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(c.file_upload_id || c.file_url) && (
                          <button onClick={() => void openContractFile(c)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"><Download size={12} /> Download</button>
                        )}
                        {!c.summary && (
                          <button onClick={() => void analyzeContract(c)} disabled={analyzingId === c.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition disabled:opacity-50">
                            {analyzingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            {analyzingId === c.id ? "Analyzing…" : "AI Analyze"}
                          </button>
                        )}
                        <button onClick={() => startEditC(c)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                        <button onClick={() => handleCDelete(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Delete</button>
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
            {showCForm && <button onClick={() => { setShowCForm(false); setEditingCId(null); setCForm({ ...EMPTY_C_FORM }); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={15} /></button>}
          </div>
          {!showCForm ? (
            <div className="p-5 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center"><FileSignature size={20} className="text-purple-600" /></div>
              <p className="text-xs text-gray-500">Upload AIA contracts, subcontracts, or any project agreement. AI extracts key requirements in plain English.</p>
              <button onClick={() => { setCForm({ ...EMPTY_C_FORM }); setEditingCId(null); setShowCForm(true); }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] transition">
                <Plus size={14} /> Upload Contract
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Title *</label>
                <input value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} placeholder="e.g. Prime Contract – Phase 1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Contract Type</label>
                  <select value={cForm.contract_type} onChange={(e) => setCForm({ ...cForm, contract_type: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6]">
                    <option value="">Select…</option>
                    {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                  <select value={cForm.status} onChange={(e) => setCForm({ ...cForm, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6]">
                    {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Parties</label>
                <input value={cForm.parties} onChange={(e) => setCForm({ ...cForm, parties: e.target.value })} placeholder="Owner, GC – separate by comma" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Contract Value ($)</label>
                  <input type="number" value={cForm.contract_value} onChange={(e) => setCForm({ ...cForm, contract_value: e.target.value })} placeholder="0" min="0" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Executed Date</label>
                  <input type="date" value={cForm.executed_date} onChange={(e) => setCForm({ ...cForm, executed_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6]" />
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
                <textarea value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} rows={2} placeholder="Scope notes, amendments…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6] resize-none" />
              </div>
              <button onClick={handleCSubmit} disabled={cSaving || !cForm.title.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] disabled:opacity-50 transition">
                {cSaving && <Loader2 size={14} className="animate-spin" />}
                {editingCId ? "Update Contract" : "Save Contract"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
