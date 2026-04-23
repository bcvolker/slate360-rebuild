"use client";

import { Loader2, X } from "lucide-react";
import { type SubmittalFormData, DOCUMENT_TYPES, DOCUMENT_CODE_OPTIONS, STATUSES } from "./_shared";

interface Props {
  form: SubmittalFormData;
  setForm: (f: SubmittalFormData) => void;
  editingId: string | null;
  saving: boolean;
  attachment: File | null;
  setAttachment: (f: File | null) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const inp = "w-full rounded-lg border border-zinc-700 bg-card px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 placeholder:text-zinc-500";
const lbl = "mb-1 block text-xs font-bold text-zinc-300";

export default function SubmittalsForm({ form, setForm, editingId, saving, attachment, setAttachment, onSubmit, onClose }: Props) {
  const u = (patch: Partial<SubmittalFormData>) => setForm({ ...form, ...patch });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-card px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground">{editingId ? "Edit Submittal" : "New Submittal"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-card"><X size={18} /></button>
        </div>
        <div className="space-y-5 p-6">
          <div><label className={lbl}>Title *</label><input type="text" value={form.title} onChange={(e) => u({ title: e.target.value })} className={inp} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Document Type</label><select value={form.document_type} onChange={(e) => u({ document_type: e.target.value })} className={inp}>{DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={lbl}>AIA / Form Code</label><input list="document-code-options" value={form.document_code} onChange={(e) => u({ document_code: e.target.value })} placeholder="Select or type" className={inp} /><datalist id="document-code-options">{DOCUMENT_CODE_OPTIONS.map((c) => <option key={c} value={c} />)}</datalist></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Spec Section</label><input type="text" value={form.spec_section} onChange={(e) => u({ spec_section: e.target.value })} placeholder="e.g. 03 30 00" className={inp} /></div>
            <div><label className={lbl}>Status</label><select value={form.status} onChange={(e) => u({ status: e.target.value })} className={inp}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Amount ($)</label><input type="number" value={form.amount} onChange={(e) => u({ amount: e.target.value })} min="0" step="0.01" className={inp} /></div>
            <div><label className={lbl}>Version</label><input type="number" value={form.version_number} onChange={(e) => u({ version_number: e.target.value })} min="1" className={inp} /></div>
            <div><label className={lbl}>Stakeholder Email</label><input type="email" value={form.stakeholder_email} onChange={(e) => u({ stakeholder_email: e.target.value })} placeholder="client@company.com" className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Responsible Contractor</label><input type="text" value={form.responsible_contractor} onChange={(e) => u({ responsible_contractor: e.target.value })} placeholder="Company name" className={inp} /></div>
            <div><label className={lbl}>Revision #</label><input type="number" value={form.revision_number} onChange={(e) => u({ revision_number: e.target.value })} min="0" className={inp} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Due Date</label><input type="date" value={form.due_date} onChange={(e) => u({ due_date: e.target.value })} className={inp} /></div>
            <div><label className={lbl}>Required Date</label><input type="date" value={form.required_date} onChange={(e) => u({ required_date: e.target.value })} className={inp} /></div>
            <div><label className={lbl}>Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={(e) => u({ lead_time_days: e.target.value })} className={inp} /></div>
          </div>
          {editingId && <div><label className={lbl}>Response / Notes</label><textarea value={form.response_text} onChange={(e) => u({ response_text: e.target.value })} rows={3} placeholder="Enter response or review notes..." className={`${inp} resize-none`} /></div>}
          {!editingId && <div><label className={lbl}>Attachment</label><input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-zinc-700 bg-card px-3 py-2 text-sm text-zinc-300" /></div>}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={onSubmit} disabled={saving || !form.title.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update Submittal" : "Create Submittal"}</button>
            <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-card px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
