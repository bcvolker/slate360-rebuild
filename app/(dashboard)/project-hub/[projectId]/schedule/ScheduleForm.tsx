"use client";

import { Calendar, Flag, Loader2, Trash2, User, X } from "lucide-react";
import { type ScheduleFormData, STATUSES, PRIORITIES, STATUS_COLORS } from "./_shared";

interface Props {
  form: ScheduleFormData;
  setForm: (f: ScheduleFormData) => void;
  editingId: string | null;
  saving: boolean;
  onSubmit: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  contractorName: string;
  ownerName: string;
  architectName: string;
}

const inp = "w-full rounded-lg border border-zinc-700 bg-card px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 placeholder:text-zinc-500";
const lbl = "mb-1 block text-xs font-bold text-zinc-300";

export default function ScheduleForm({ form, setForm, editingId, saving, onSubmit, onDelete, onClose, contractorName, ownerName, architectName }: Props) {
  const u = (patch: Partial<ScheduleFormData>) => setForm({ ...form, ...patch });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-card px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground">{editingId ? "Edit Task" : "New Task"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-card"><X size={18} /></button>
        </div>
        <div className="space-y-5 p-6">
          <div><label className={lbl}>Task Name *</label><input autoFocus type="text" value={form.name} onChange={(e) => u({ name: e.target.value })} placeholder="e.g. Foundation pour, Framing, Roofing..." className={inp} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}><Calendar size={11} className="mr-1 inline" /> Start Date</label><input type="date" value={form.startDate} onChange={(e) => u({ startDate: e.target.value })} className={inp} /></div>
            <div><label className={lbl}><Calendar size={11} className="mr-1 inline" /> End Date</label><input type="date" value={form.endDate} onChange={(e) => u({ endDate: e.target.value })} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Status</label><select value={form.status} onChange={(e) => u({ status: e.target.value })} className={inp}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={lbl}>Priority</label><select value={form.priority} onChange={(e) => u({ priority: e.target.value })} className={inp}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div>
            <label className={lbl}>% Complete — <span className="text-[#3B82F6]">{form.percentComplete}%</span></label>
            <input type="range" min="0" max="100" step="5" value={form.percentComplete} onChange={(e) => u({ percentComplete: e.target.value })} className="w-full accent-[#3B82F6]" />
          </div>
          <div><label className={lbl}><User size={11} className="mr-1 inline" /> Assigned To</label>
            <input type="text" value={form.assignedTo} onChange={(e) => u({ assignedTo: e.target.value })} list="assignee-opts" placeholder={contractorName || "Name"} className={inp} />
            <datalist id="assignee-opts">{contractorName && <option value={contractorName} />}{ownerName && <option value={ownerName} />}{architectName && <option value={architectName} />}</datalist>
          </div>
          <div className="flex items-center gap-3"><input type="checkbox" id="ms" checked={form.isMilestone} onChange={(e) => u({ isMilestone: e.target.checked })} className="rounded border-zinc-600 accent-[#3B82F6]" /><label htmlFor="ms" className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300"><Flag size={13} className="text-purple-400" /> Mark as Milestone</label></div>
          <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={(e) => u({ notes: e.target.value })} rows={3} placeholder="Dependencies, sub-tasks, notes..." className={`${inp} resize-none`} /></div>
          {editingId && (
            <div className="flex flex-wrap gap-2"><p className="w-full text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quick-set status</p>{STATUSES.filter((s) => s !== form.status).map((s) => <button key={s} type="button" onClick={() => u({ status: s, percentComplete: s === "Completed" ? "100" : form.percentComplete })} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition ${(STATUS_COLORS[s] ?? STATUS_COLORS["Not Started"]).badge}`}>{s}</button>)}</div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={onSubmit} disabled={saving || !form.name.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[#1D4ED8] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update Task" : "Add Task"}</button>
            <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-card px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Cancel</button>
            {editingId && <button onClick={() => onDelete(editingId)} className="rounded-lg border border-red-900/50 bg-card px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30"><Trash2 size={14} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
