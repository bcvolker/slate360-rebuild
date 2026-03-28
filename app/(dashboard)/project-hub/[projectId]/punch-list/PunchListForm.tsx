"use client";

import { X } from "lucide-react";
import { type PunchFormData, type PunchItem, STATUSES, PRIORITIES, TRADES } from "./_shared";

interface Props {
  form: PunchFormData;
  setForm: React.Dispatch<React.SetStateAction<PunchFormData>>;
  editingId: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

const field = "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const label = "block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function PunchListForm({ form, setForm, editingId, saving, onSubmit, onClose }: Props) {
  const set = (k: keyof PunchFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-bold text-white">{editingId ? "Edit Item" : "New Punch Item"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div><label className={label}>Title *</label><input className={field} value={form.title} onChange={set("title")} placeholder="Describe the issue…" /></div>
          <div><label className={label}>Description</label><textarea className={`${field} min-h-[80px] resize-y`} rows={3} value={form.description} onChange={set("description")} placeholder="Additional details…" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Status</label><select className={field} value={form.status} onChange={set("status")}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={set("priority")}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className={label}>Assignee</label><input className={field} value={form.assignee} onChange={set("assignee")} placeholder="Name" /></div>
          <div><label className={label}>Trade / Category</label><select className={field} value={form.trade_category} onChange={set("trade_category")}><option value="">Select trade…</option>{TRADES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className={label}>Location / Area</label><input className={field} value={form.location_area} onChange={set("location_area")} placeholder="e.g. 2nd Floor Bathroom" /></div>
          <div><label className={label}>Due Date</label><input type="date" className={field} value={form.due_date} onChange={set("due_date")} /></div>
          <div className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 p-6 text-center text-xs text-zinc-500">Photo upload coming soon</div>
        </div>
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4 flex items-center gap-3">
          <button disabled={saving || !form.title.trim()} onClick={onSubmit} className="flex-1 rounded-xl bg-[#FF4D00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e64500] transition disabled:opacity-40">{saving ? "Saving…" : editingId ? "Update" : "Create"}</button>
          <button onClick={onClose} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}
