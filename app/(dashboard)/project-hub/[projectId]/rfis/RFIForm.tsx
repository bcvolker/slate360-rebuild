"use client";

import { X } from "lucide-react";
import { type RFIFormData, STATUSES, PRIORITIES } from "./_shared";

interface Props {
  form: RFIFormData;
  setForm: React.Dispatch<React.SetStateAction<RFIFormData>>;
  editingId: string | null;
  saving: boolean;
  attachment: File | null;
  setAttachment: (f: File | null) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const field = "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const label = "block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function RFIForm({ form, setForm, editingId, saving, attachment, setAttachment, onSubmit, onClose }: Props) {
  const set = (k: keyof RFIFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-bold text-white">{editingId ? "Edit RFI" : "New RFI"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div><label className={label}>Subject *</label><input className={field} value={form.subject} onChange={set("subject")} /></div>
          <div><label className={label}>Question *</label><textarea className={`${field} resize-y`} rows={4} value={form.question} onChange={set("question")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Status</label><select className={field} value={form.status} onChange={set("status")}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={set("priority")}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Assigned To</label><input className={field} value={form.assigned_to} onChange={set("assigned_to")} placeholder="Name or company" /></div>
            <div><label className={label}>Ball in Court</label><input className={field} value={form.ball_in_court} onChange={set("ball_in_court")} placeholder="Who needs to respond" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={label}>Due Date</label><input type="date" className={field} value={form.due_date} onChange={set("due_date")} /></div>
            <div><label className={label}>Cost Impact ($)</label><input type="number" className={field} value={form.cost_impact} onChange={set("cost_impact")} /></div>
            <div><label className={label}>Schedule (days)</label><input type="number" className={field} value={form.schedule_impact} onChange={set("schedule_impact")} /></div>
          </div>
          {editingId && <div><label className={label}>Response</label><textarea className={`${field} resize-y`} rows={3} value={form.response_text} onChange={set("response_text")} placeholder="Enter official response…" /></div>}
          {!editingId && (
            <div>
              <label className={label}>Attachment</label>
              <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-300" />
            </div>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4 flex items-center gap-3">
          <button disabled={saving || !form.subject.trim() || !form.question.trim()} onClick={onSubmit} className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8] transition disabled:opacity-40">{saving ? "Saving…" : editingId ? "Update RFI" : "Create RFI"}</button>
          <button onClick={onClose} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}
