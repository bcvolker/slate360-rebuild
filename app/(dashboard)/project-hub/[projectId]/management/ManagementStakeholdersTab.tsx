"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Mail, MapPin, Phone, Plus,
  Trash2, User, Users, X, Hash,
} from "lucide-react";
import type { CompanyProfile } from "@/lib/hooks/useProjectProfile";
import { type Stakeholder, ROLES, ROLE_COLORS, EMPTY_S_FORM } from "./_shared";

interface Props {
  projectId: string;
  company: CompanyProfile;
  showToast: (msg: string) => void;
  onStatsChange: (total: number, subcontractors: number) => void;
}

export default function ManagementStakeholdersTab({ projectId, company, showToast, onStatsChange }: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [sLoading, setSLoading] = useState(true);
  const [showSForm, setShowSForm] = useState(false);
  const [editingSId, setEditingSId] = useState<string | null>(null);
  const [sForm, setSForm] = useState({ ...EMPTY_S_FORM });
  const [sSaving, setSSaving] = useState(false);
  const [expandedSId, setExpandedSId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const loadStakeholders = useCallback(async () => {
    setSLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/stakeholders`, { cache: "no-store" });
      const d = await res.json();
      const list: Stakeholder[] = Array.isArray(d.stakeholders) ? d.stakeholders : [];
      setStakeholders(list);
      onStatsChange(list.length, list.filter((s) => s.role === "Subcontractor").length);
    } catch { setStakeholders([]); onStatsChange(0, 0); }
    finally { setSLoading(false); }
  }, [projectId, onStatsChange]);

  useEffect(() => { void loadStakeholders(); }, [loadStakeholders]);

  /* Autofill from company profile */
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

  const handleSSubmit = async () => {
    if (!sForm.name.trim()) return;
    setSSaving(true);
    try {
      const method = editingSId ? "PATCH" : "POST";
      const body = editingSId ? { id: editingSId, ...sForm } : sForm;
      const res = await fetch(`/api/projects/${projectId}/management/stakeholders`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editingSId ? "Stakeholder updated" : "Stakeholder added");
      setShowSForm(false); setEditingSId(null); setSForm({ ...EMPTY_S_FORM });
      await loadStakeholders();
    } catch (err) { showToast(err instanceof Error ? err.message : "Save failed"); }
    finally { setSSaving(false); }
  };

  const handleSDelete = async (id: string) => {
    if (!confirm("Remove this stakeholder?")) return;
    await fetch(`/api/projects/${projectId}/management/stakeholders?id=${id}`, { method: "DELETE" });
    showToast("Removed"); await loadStakeholders();
  };

  const startEditS = (s: Stakeholder) => {
    setSForm({ name: s.name, role: s.role, company: s.company ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", license_no: s.license_no ?? "", notes: s.notes ?? "", status: s.status });
    setEditingSId(s.id); setShowSForm(true);
  };

  const filteredStakeholders = useMemo(() =>
    roleFilter === "all" ? stakeholders : stakeholders.filter((s) => s.role === roleFilter),
  [stakeholders, roleFilter]);

  const roleGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    stakeholders.forEach((s) => { groups[s.role] = (groups[s.role] ?? 0) + 1; });
    return groups;
  }, [stakeholders]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── Left: List ── */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRoleFilter("all")} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${roleFilter === "all" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              All ({stakeholders.length})
            </button>
            {Object.entries(roleGroups).map(([role, count]) => (
              <button key={role} onClick={() => setRoleFilter(role)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${roleFilter === role ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {role} ({count})
              </button>
            ))}
          </div>
          <button onClick={() => { setSForm({ ...EMPTY_S_FORM }); setEditingSId(null); setShowSForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
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
                    <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                      <User size={16} className="text-[#F59E0B]" />
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
                        {([["Role", s.role], ["Company", s.company], ["Email", s.email], ["Phone", s.phone], ["Address", s.address], ["License #", s.license_no]] as [string, string | null][]).filter(([, v]) => v).map(([l, v]) => (
                          <div key={l}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                            <p className="mt-0.5 text-xs font-semibold text-gray-800 break-all">{v}</p>
                          </div>
                        ))}
                      </div>
                      {s.notes && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">{s.notes}</div>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {s.email && <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"><Mail size={12} /> Email</a>}
                        {s.phone && <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"><Phone size={12} /> Call</a>}
                        <button onClick={() => startEditS(s)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                        <button onClick={() => handleSDelete(s.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Remove</button>
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
            {showSForm && <button onClick={() => { setShowSForm(false); setEditingSId(null); setSForm({ ...EMPTY_S_FORM }); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={15} /></button>}
          </div>
          {!showSForm ? (
            <div className="p-5 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center"><Users size={20} className="text-[#F59E0B]" /></div>
              <p className="text-xs text-gray-500">Add owners, architects, GCs, subs, engineers, or any project stakeholder.</p>
              <button onClick={() => { setSForm({ ...EMPTY_S_FORM }); setEditingSId(null); setShowSForm(true); }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E04400] transition">
                <Plus size={14} /> Add Stakeholder
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Name *</label>
                <input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Role *</label>
                  <select value={sForm.role} onChange={(e) => setSForm({ ...sForm, role: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                  <select value={sForm.status} onChange={(e) => setSForm({ ...sForm, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]">
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Company</label>
                <input value={sForm.company} onChange={(e) => setSForm({ ...sForm, company: e.target.value })} placeholder="Company name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Mail size={10} className="inline mr-1" />Email</label>
                  <input type="email" value={sForm.email} onChange={(e) => setSForm({ ...sForm, email: e.target.value })} placeholder="email@co.com" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Phone size={10} className="inline mr-1" />Phone</label>
                  <input type="tel" value={sForm.phone} onChange={(e) => setSForm({ ...sForm, phone: e.target.value })} placeholder="(555) 000-0000" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700"><MapPin size={10} className="inline mr-1" />Address</label>
                <input value={sForm.address} onChange={(e) => setSForm({ ...sForm, address: e.target.value })} placeholder="123 Main St, City, ST" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700"><Hash size={10} className="inline mr-1" />License / Cert #</label>
                <input value={sForm.license_no} onChange={(e) => setSForm({ ...sForm, license_no: e.target.value })} placeholder="GC-12345" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Notes</label>
                <textarea value={sForm.notes} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })} rows={2} placeholder="Scope, specialty, payment terms…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B] resize-none" />
              </div>
              <button onClick={handleSSubmit} disabled={sSaving || !sForm.name.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E04400] disabled:opacity-50 transition">
                {sSaving && <Loader2 size={14} className="animate-spin" />}
                {editingSId ? "Update" : "Add Stakeholder"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
