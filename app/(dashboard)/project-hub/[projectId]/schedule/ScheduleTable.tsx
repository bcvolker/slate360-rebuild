"use client";

import { Calendar, Flag, History, Loader2, Pencil, Trash2, User } from "lucide-react";
import { type TaskRow, STATUS_COLORS } from "./_shared";

interface Props {
  rows: TaskRow[];
  loading: boolean;
  onEdit: (row: TaskRow) => void;
  onHistory: (row: TaskRow) => void;
  onDelete: (id: string) => void;
}

export default function ScheduleTable({ rows, loading, onEdit, onHistory, onDelete }: Props) {
  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-card p-8 text-center text-sm text-zinc-400"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading...</div>;
  if (rows.length === 0) return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-card p-12 text-center">
      <Calendar size={32} className="mx-auto mb-3 text-zinc-600" /><p className="text-sm font-semibold text-zinc-300">No tasks yet</p>
      <p className="mt-1 text-xs text-zinc-500">Click &quot;Add Task&quot; to start building your schedule.</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/50 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">End</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pct = row.percent_complete ?? 0;
              const colors = STATUS_COLORS[row.status] ?? STATUS_COLORS["Not Started"];
              return (
                <tr key={row.id} className="border-t border-zinc-800 hover:bg-card/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.is_milestone && <Flag size={12} className="text-purple-400 shrink-0" />}
                      <div><p className="font-semibold text-zinc-200">{row.name}</p>{row.notes && <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{row.notes}</p>}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{row.start_date ? new Date(row.start_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{row.end_date ? new Date(row.end_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${colors.badge}`}>{row.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-card overflow-hidden"><div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} /></div>
                      <span className="text-[10px] font-bold text-zinc-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{row.assigned_to ? <span className="flex items-center gap-1"><User size={10} />{row.assigned_to}</span> : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => onEdit(row)} className="rounded-md p-1.5 text-zinc-500 hover:bg-card hover:text-zinc-300"><Pencil size={13} /></button>
                      <button onClick={() => onHistory(row)} className="rounded-md p-1.5 text-zinc-500 hover:bg-card hover:text-zinc-300" title="History"><History size={13} /></button>
                      <button onClick={() => onDelete(row.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-950/30 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
