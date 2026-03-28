"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, Clock, Download, Loader2, Plus, Save, ZoomIn, ZoomOut,
} from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import {
  type TaskRow, type ScheduleFormData, EMPTY_FORM, STATUS_COLORS,
  addDays, fmtYMD, MS_DAY,
} from "./_shared";
import ScheduleGantt from "./ScheduleGantt";
import ScheduleTable from "./ScheduleTable";
import ScheduleForm from "./ScheduleForm";

export default function ProjectSchedulePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile } = useProjectProfile(projectId);

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dayW, setDayW] = useState(28);
  const [viewMode, setViewMode] = useState<"gantt" | "table">("gantt");
  const dragRef = useRef<{ taskId: string; startX: number; origEndMs: number } | null>(null);
  const [dragEndMs, setDragEndMs] = useState<Record<string, number>>({});
  const [historyItem, setHistoryItem] = useState<TaskRow | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-schedule-${projectId}`, []);

  /* ── Data loading ─────────────────────────────────── */
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, { cache: "no-store" });
      const payload = await res.json();
      setRows(Array.isArray(payload.tasks) ? payload.tasks : []);
    } catch { setRows([]); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  /* ── Computed ──────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "Completed").length;
    const inProgress = rows.filter((r) => r.status === "In Progress").length;
    const delayed = rows.filter((r) => r.status === "Delayed").length;
    const milestones = rows.filter((r) => r.is_milestone).length;
    const avgPct = total > 0 ? Math.round(rows.reduce((s, r) => s + (r.percent_complete ?? 0), 0) / total) : 0;
    return { total, completed, inProgress, delayed, milestones, avgPct };
  }, [rows]);

  const { ganttStart, totalDays } = useMemo(() => {
    const dated = rows.filter((r) => r.start_date && r.end_date);
    const today = Date.now();
    if (dated.length === 0) return { ganttStart: addDays(today, -7), totalDays: 90 };
    const minMs = Math.min(...dated.map((r) => new Date(r.start_date!).getTime()));
    const maxMs = Math.max(...dated.map((r) => new Date(r.end_date!).getTime()));
    const s = addDays(Math.min(minMs, today - 7 * MS_DAY), -7);
    const e = addDays(Math.max(maxMs, today + 7 * MS_DAY), 14);
    return { ganttStart: s, totalDays: Math.ceil((e.getTime() - s.getTime()) / MS_DAY) };
  }, [rows]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number; startDay: number }[] = [];
    let cur: typeof groups[0] | null = null;
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(ganttStart.getTime(), i);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!cur || cur.label !== label) { if (cur) groups.push(cur); cur = { label, span: 1, startDay: i }; } else cur.span++;
    }
    if (cur) groups.push(cur);
    return groups;
  }, [ganttStart, totalDays]);

  const dayNumbers = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(ganttStart.getTime(), i)), [ganttStart, totalDays]);
  const todayOffsetPx = useMemo(() => ((Date.now() - ganttStart.getTime()) / MS_DAY) * dayW, [ganttStart, dayW]);

  /* ── Handlers ─────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.name.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      await fetch(`/api/projects/${projectId}/schedule`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setToast(editingId ? "Task updated" : "Task added");
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); await load();
    } catch { setToast("Error saving task"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this task?")) return;
    try {
      await fetch(`/api/projects/${projectId}/schedule`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Task deleted"); await load();
    } catch { setToast("Error deleting"); }
  };

  const startEdit = (row: TaskRow) => {
    setForm({ name: row.name, startDate: row.start_date ?? "", endDate: row.end_date ?? "", status: row.status, percentComplete: String(row.percent_complete ?? 0), assignedTo: row.assigned_to ?? "", priority: row.priority ?? "Normal", notes: row.notes ?? "", isMilestone: row.is_milestone ?? false });
    setEditingId(row.id); setShowCreate(true);
  };

  const handleResizeStart = (e: React.MouseEvent, task: TaskRow) => {
    e.preventDefault();
    const endMs = task.end_date ? new Date(task.end_date).getTime() : Date.now();
    dragRef.current = { taskId: task.id, startX: e.clientX, origEndMs: endMs };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaDays = Math.round((ev.clientX - dragRef.current.startX) / dayW);
      const newEndMs = Math.max(dragRef.current.origEndMs, dragRef.current.origEndMs + deltaDays * MS_DAY);
      setDragEndMs((prev) => ({ ...prev, [dragRef.current!.taskId]: newEndMs }));
    };
    const onUp = async (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaDays = Math.round((ev.clientX - dragRef.current.startX) / dayW);
      if (deltaDays !== 0) {
        const newEndDate = fmtYMD(new Date(dragRef.current.origEndMs + deltaDays * MS_DAY));
        await fetch(`/api/projects/${projectId}/schedule`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: dragRef.current.taskId, endDate: newEndDate }) });
        await load();
      }
      setDragEndMs((prev) => { const n = { ...prev }; delete n[dragRef.current!.taskId]; return n; });
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const exportCSV = () => {
    const csv = [["Task","Start","End","Status","% Complete","Assigned","Priority","Milestone"], ...rows.map((r) => [r.name, r.start_date ?? "", r.end_date ?? "", r.status, String(r.percent_complete), r.assigned_to ?? "", r.priority, r.is_milestone ? "Yes" : ""])].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `schedule-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    setToast("Exported");
  };

  const onSaveSnapshot = async () => {
    if (!projectId || rows.length === 0) return;
    setSnapshotSaving(true);
    try {
      const csv = [["Task","Start","End","Status","% Complete"], ...rows.map((r) => [r.name, r.start_date ?? "", r.end_date ?? "", r.status, String(r.percent_complete)])].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}`).join(",")).join("\n");
      const fd = new FormData(); fd.set("file", new File([csv], `schedule-snapshot-${new Date().toISOString().slice(0,10)}.csv`, { type: "text/csv" }));
      const res = await fetch(`/api/projects/${projectId}/schedule/snapshot`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setToast("Snapshot saved");
    } catch { setToast("Error saving snapshot"); } finally { setSnapshotSaving(false); }
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeline</p>
          <h2 className="text-xl font-black text-white">Schedule & Tasks{profile.projectName && <span className="ml-2 text-base font-semibold text-zinc-500">— {profile.projectName}</span>}</h2>
          <p className="mt-1 text-sm text-zinc-400">Plan tasks, set milestones, and track progress with Gantt.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
            <button onClick={() => setViewMode("gantt")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "gantt" ? "bg-[#FF4D00] text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>Gantt</button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "table" ? "bg-[#FF4D00] text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>Table</button>
          </div>
          {viewMode === "gantt" && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5">
              <button onClick={() => setDayW((w) => Math.max(14, w - 4))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400" title="Zoom out"><ZoomOut size={13} /></button>
              <span className="text-[10px] font-semibold text-zinc-500 w-10 text-center">{dayW}px/d</span>
              <button onClick={() => setDayW((w) => Math.min(60, w + 4))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400" title="Zoom in"><ZoomIn size={13} /></button>
            </div>
          )}
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40">{snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot</button>
          <ViewCustomizer storageKey={`viewprefs-schedule-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <button onClick={() => { setForm({ ...EMPTY_FORM, assignedTo: profile.contractorName }); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> Add Task</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Delayed", value: stats.delayed, color: "text-red-400" },
          { label: "Milestones", value: stats.milestones, color: "text-purple-400" },
          { label: "Avg %", value: `${stats.avgPct}%`, color: "text-white" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* View */}
      {viewMode === "gantt" ? (
        <ScheduleGantt rows={rows} loading={loading} ganttStart={ganttStart} totalDays={totalDays} monthGroups={monthGroups} dayNumbers={dayNumbers} todayOffsetPx={todayOffsetPx} dayW={dayW} dragEndMs={dragEndMs} onEdit={startEdit} onResizeStart={handleResizeStart} />
      ) : (
        <ScheduleTable rows={rows} loading={loading} onEdit={startEdit} onHistory={setHistoryItem} onDelete={(id) => void handleDelete(id)} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-zinc-500">
        {Object.entries(STATUS_COLORS).map(([status, c]) => (
          <span key={status} className="flex items-center gap-1.5"><span className={`w-3 h-1.5 rounded-full inline-block ${c.bar}`} />{status}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45 inline-block bg-purple-500 rounded-sm" />Milestone</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 inline-block bg-[#FF4D00]" />Today</span>
        {viewMode === "gantt" && <span className="text-zinc-600 italic">Drag right edge of bar to adjust end date</span>}
      </div>

      {/* Slide-over form */}
      {showCreate && (
        <ScheduleForm form={form} setForm={setForm} editingId={editingId} saving={saving} onSubmit={handleSubmit} onDelete={handleDelete} onClose={() => { setShowCreate(false); setEditingId(null); }} contractorName={profile.contractorName} ownerName={profile.ownerName} architectName={profile.architectName} />
      )}

      {viewMode === "gantt" && rows.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500"><Clock size={12} /><span>Today: <strong className="text-zinc-300">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</strong></span><ChevronRight size={12} /><span className="text-zinc-600 italic">Scroll Gantt to the orange line · Drag right edge of bar to resize</span></div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-800 bg-emerald-950/80 px-4 py-2 text-sm font-medium text-emerald-300 shadow-lg">{toast}</div>}

      <ChangeHistory open={historyItem !== null} onClose={() => setHistoryItem(null)} title={historyItem ? historyItem.name : ""} entries={historyItem ? buildBaseHistory(historyItem) : []} subfolder="Schedule" />
    </section>
  );
}
