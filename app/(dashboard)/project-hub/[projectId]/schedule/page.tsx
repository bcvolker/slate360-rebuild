"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar, ChevronRight, Clock, Download, Flag, Loader2,
  Pencil, Plus, Save, Trash2, User, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";

type TaskRow = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  status: string; percent_complete: number; assigned_to: string | null;
  priority: string; notes: string | null; is_milestone: boolean;
  created_at: string; updated_at: string | null;
};
type FormData = {
  name: string; startDate: string; endDate: string; status: string;
  percentComplete: string; assignedTo: string; priority: string;
  notes: string; isMilestone: boolean;
};

const STATUSES = ["Not Started", "In Progress", "Completed", "On Hold", "Delayed"];
const PRIORITIES = ["Low", "Normal", "High", "Critical"];
const STATUS_COLORS: Record<string, { bar: string; badge: string }> = {
  "Not Started": { bar: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 border-gray-200" },
  "In Progress": { bar: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 border-blue-200" },
  Completed:     { bar: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "On Hold":     { bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  Delayed:       { bar: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200" },
};
const PRIORITY_DOT: Record<string, string> = {
  Low: "bg-gray-300", Normal: "bg-blue-400", High: "bg-amber-400", Critical: "bg-red-500",
};
const EMPTY_FORM: FormData = {
  name: "", startDate: "", endDate: "", status: "Not Started",
  percentComplete: "0", assignedTo: "", priority: "Normal", notes: "", isMilestone: false,
};

const MS_DAY = 86_400_000;
const TASK_ROW_H = 40;
const LEFT_W = 240;

function addDays(ms: number, n: number) { return new Date(ms + n * MS_DAY); }
function fmtYMD(d: Date) { return d.toISOString().slice(0, 10); }

export default function ProjectSchedulePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile } = useProjectProfile(projectId);

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dayW, setDayW] = useState(28);
  const [viewMode, setViewMode] = useState<"gantt" | "table">("gantt");
  const dragRef = useRef<{ taskId: string; startX: number; origEndMs: number } | null>(null);
  const [dragEndMs, setDragEndMs] = useState<Record<string, number>>({});

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
    if (dated.length === 0) {
      return { ganttStart: addDays(today, -7), totalDays: 90 };
    }
    const minMs = Math.min(...dated.map((r) => new Date(r.start_date!).getTime()));
    const maxMs = Math.max(...dated.map((r) => new Date(r.end_date!).getTime()));
    const s = addDays(Math.min(minMs, today - 7 * MS_DAY), -7);
    const e = addDays(Math.max(maxMs, today + 7 * MS_DAY), 14);
    const totalDays = Math.ceil((e.getTime() - s.getTime()) / MS_DAY);
    return { ganttStart: s, totalDays };
  }, [rows]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number; startDay: number }[] = [];
    let cur: typeof groups[0] | null = null;
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(ganttStart.getTime(), i);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!cur || cur.label !== label) { if (cur) groups.push(cur); cur = { label, span: 1, startDay: i }; }
      else { cur.span++; }
    }
    if (cur) groups.push(cur);
    return groups;
  }, [ganttStart, totalDays]);

  const dayNumbers = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(ganttStart.getTime(), i)), [ganttStart, totalDays]);

  const todayOffsetPx = useMemo(() => ((Date.now() - ganttStart.getTime()) / MS_DAY) * dayW, [ganttStart, dayW]);

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

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  const getBar = (task: TaskRow) => {
    if (!task.start_date || !task.end_date) return null;
    const startMs = new Date(task.start_date).getTime();
    const rawEndMs = dragEndMs[task.id] ?? new Date(task.end_date).getTime();
    return { left: ((startMs - ganttStart.getTime()) / MS_DAY) * dayW, width: Math.max(dayW, ((rawEndMs - startMs) / MS_DAY) * dayW) };
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
          <h2 className="text-xl font-black text-gray-900">Schedule & Tasks{profile.projectName && <span className="ml-2 text-base font-semibold text-gray-400">— {profile.projectName}</span>}</h2>
          <p className="mt-1 text-sm text-gray-500">Plan tasks, set milestones, and track progress with Gantt.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button onClick={() => setViewMode("gantt")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "gantt" ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Gantt</button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "table" ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Table</button>
          </div>
          {viewMode === "gantt" && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
              <button onClick={() => setDayW((w) => Math.max(14, w - 4))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="Zoom out"><ZoomOut size={13} /></button>
              <span className="text-[10px] font-semibold text-gray-500 w-10 text-center">{dayW}px/d</span>
              <button onClick={() => setDayW((w) => Math.min(60, w + 4))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="Zoom in"><ZoomIn size={13} /></button>
            </div>
          )}
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">{snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot</button>
          <button onClick={() => { setForm({ ...EMPTY_FORM, assignedTo: profile.contractorName }); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> Add Task</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
          { label: "Delayed", value: stats.delayed, color: "text-red-600" },
          { label: "Milestones", value: stats.milestones, color: "text-purple-600" },
          { label: "Avg %", value: `${stats.avgPct}%`, color: "text-gray-900" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* GANTT VIEW */}
      {viewMode === "gantt" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden select-none">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading schedule…</div>
          ) : (
            <div className="flex">
              {/* Left fixed panel */}
              <div className="shrink-0 border-r border-gray-200" style={{ width: LEFT_W }}>
                <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 flex items-center" style={{ height: 64 }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Task</span>
                </div>
                {rows.length === 0 ? (
                  <div className="p-6 text-center">
                    <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400 font-semibold">No tasks yet</p>
                    <p className="text-[10px] text-gray-400 mt-1">Click &quot;Add Task&quot; to begin.</p>
                  </div>
                ) : rows.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 px-3 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer" style={{ height: TASK_ROW_H }} onClick={() => startEdit(task)}>
                    {task.is_milestone ? <Flag size={11} className="text-purple-500 shrink-0" /> : <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-gray-300"}`} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">{task.name}</p>
                      <p className="text-[9px] text-gray-400 truncate">
                        {task.assigned_to ? task.assigned_to : ""}{task.start_date ? ` · ${new Date(task.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${(STATUS_COLORS[task.status] ?? STATUS_COLORS["Not Started"]).badge}`}>
                      {task.status === "Completed" ? "✓" : task.status === "Delayed" ? "!" : task.status === "In Progress" ? "▶" : task.status === "On Hold" ? "⏸" : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right scrollable Gantt */}
              <div className="flex-1 overflow-x-auto" style={{ minWidth: 0 }}>
                <div style={{ width: totalDays * dayW, minWidth: "100%" }}>
                  {/* Month header */}
                  <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 flex" style={{ height: 32 }}>
                    {monthGroups.map((mg) => (
                      <div key={`${mg.label}-${mg.startDay}`} className="flex items-center justify-center border-r border-gray-200 text-[9px] font-bold uppercase tracking-wider text-gray-500" style={{ width: mg.span * dayW, minWidth: mg.span * dayW }}>
                        {mg.label}
                      </div>
                    ))}
                  </div>
                  {/* Day header */}
                  <div className="sticky top-8 z-10 bg-white border-b border-gray-200 flex" style={{ height: 32 }}>
                    {dayNumbers.map((d, i) => {
                      const dow = d.getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      const isToday = fmtYMD(d) === fmtYMD(new Date());
                      return (
                        <div key={i} className={["flex items-center justify-center shrink-0 border-r border-gray-100 text-[8px] font-semibold", isToday ? "bg-[#FF4D00]/10 text-[#FF4D00] font-black" : isWeekend ? "bg-gray-50 text-gray-300" : "text-gray-400"].join(" ")} style={{ width: dayW, minWidth: dayW }} title={d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}>
                          {dayW >= 24 ? d.getDate() : ""}
                        </div>
                      );
                    })}
                  </div>

                  {/* Rows */}
                  <div className="relative">
                    {dayNumbers.map((d, i) => { const dow = d.getDay(); if (dow !== 0 && dow !== 6) return null; return <div key={`ws-${i}`} className="absolute top-0 bottom-0 bg-gray-50/70 pointer-events-none" style={{ left: i * dayW, width: dayW }} />; })}
                    {todayOffsetPx >= 0 && todayOffsetPx <= totalDays * dayW && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-[#FF4D00] z-20 pointer-events-none" style={{ left: todayOffsetPx }}>
                        <div className="absolute -top-0 -left-1.5 w-3 h-3 rounded-full bg-[#FF4D00]" />
                      </div>
                    )}
                    {rows.length === 0 && <div style={{ height: 120 }} className="flex items-center justify-center"><p className="text-xs text-gray-300">Add tasks to see them here</p></div>}
                    {rows.map((task) => {
                      const bar = getBar(task);
                      const pct = task.percent_complete ?? 0;
                      const colors = STATUS_COLORS[task.status] ?? STATUS_COLORS["Not Started"];
                      return (
                        <div key={task.id} className="relative border-b border-gray-100" style={{ height: TASK_ROW_H }}>
                          {bar && !task.is_milestone && (
                            <div className="absolute top-1/2 -translate-y-1/2 rounded-md flex items-center group/bar cursor-pointer shadow-sm overflow-visible" style={{ left: bar.left, width: bar.width, height: 22 }} onClick={() => startEdit(task)} title={`${task.name} — ${task.status} (${pct}%)`}>
                              <div className={`absolute inset-0 rounded-md opacity-20 ${colors.bar}`} />
                              <div className={`absolute top-0 left-0 bottom-0 rounded-md ${colors.bar}`} style={{ width: `${pct}%` }} />
                              {bar.width > 48 && <span className="relative z-10 px-2 text-[9px] font-bold text-white drop-shadow truncate">{pct}%</span>}
                              <div className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-20 opacity-0 group-hover/bar:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, task); }}>
                                <div className="w-1 h-3 rounded-full bg-white/80" />
                              </div>
                            </div>
                          )}
                          {bar && task.is_milestone && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-purple-500 rounded-sm shadow cursor-pointer" style={{ left: bar.left - 8 }} onClick={() => startEdit(task)} title={task.name} />
                          )}
                          {!bar && <div className="absolute inset-0 flex items-center pl-3"><span className="text-[9px] text-gray-300 italic">No dates set</span></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center"><Calendar size={32} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-semibold text-gray-500">No tasks yet</p><p className="mt-1 text-xs text-gray-400">Click &quot;Add Task&quot; to start building your schedule.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">End</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3 text-center">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const pct = row.percent_complete ?? 0;
                    const colors = STATUS_COLORS[row.status] ?? STATUS_COLORS["Not Started"];
                    return (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.is_milestone && <Flag size={12} className="text-purple-500 shrink-0" />}
                            <div><p className="font-semibold text-gray-800">{row.name}</p>{row.notes && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{row.notes}</p>}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{row.start_date ? new Date(row.start_date).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{row.end_date ? new Date(row.end_date).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${colors.badge}`}>{row.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden"><div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} /></div>
                            <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{row.assigned_to ? <span className="flex items-center gap-1"><User size={10} />{row.assigned_to}</span> : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => startEdit(row)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><Pencil size={13} /></button>
                            <button onClick={() => void handleDelete(row.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-gray-400">
        {Object.entries(STATUS_COLORS).map(([status, c]) => (
          <span key={status} className="flex items-center gap-1.5"><span className={`w-3 h-1.5 rounded-full inline-block ${c.bar}`} />{status}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45 inline-block bg-purple-500 rounded-sm" />Milestone</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 inline-block bg-[#FF4D00]" />Today</span>
        {viewMode === "gantt" && <span className="text-gray-300 italic">Drag right edge of bar to adjust end date</span>}
      </div>

      {/* Slide-over */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Task" : "New Task"}</h3>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Task Name *</label><input autoFocus type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Foundation pour, Framing, Roofing…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700"><Calendar size={11} className="mr-1 inline" /> Start Date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" /></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700"><Calendar size={11} className="mr-1 inline" /> End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-bold text-gray-700">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">% Complete — <span className="text-[#FF4D00]">{form.percentComplete}%</span></label>
                <input type="range" min="0" max="100" step="5" value={form.percentComplete} onChange={(e) => setForm({ ...form, percentComplete: e.target.value })} className="w-full accent-[#FF4D00]" />
              </div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700"><User size={11} className="mr-1 inline" /> Assigned To</label>
                <input type="text" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} list="assignee-opts" placeholder={profile.contractorName || "Name"} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                <datalist id="assignee-opts">{profile.contractorName && <option value={profile.contractorName} />}{profile.ownerName && <option value={profile.ownerName} />}{profile.architectName && <option value={profile.architectName} />}</datalist>
              </div>
              <div className="flex items-center gap-3"><input type="checkbox" id="ms" checked={form.isMilestone} onChange={(e) => setForm({ ...form, isMilestone: e.target.checked })} className="rounded border-gray-300 accent-[#FF4D00]" /><label htmlFor="ms" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Flag size={13} className="text-purple-500" /> Mark as Milestone</label></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Dependencies, sub-tasks, notes…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]/30 resize-none" /></div>
              {editingId && (
                <div className="flex flex-wrap gap-2"><p className="w-full text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick-set status</p>{STATUSES.filter((s) => s !== form.status).map((s) => <button key={s} type="button" onClick={() => setForm({ ...form, status: s, percentComplete: s === "Completed" ? "100" : form.percentComplete })} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition ${(STATUS_COLORS[s] ?? STATUS_COLORS["Not Started"]).badge}`}>{s}</button>)}</div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update Task" : "Add Task"}</button>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                {editingId && <button onClick={() => void handleDelete(editingId)} className="rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "gantt" && rows.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400"><Clock size={12} /><span>Today: <strong className="text-gray-600">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</strong></span><ChevronRight size={12} /><span className="text-gray-400 italic">Scroll Gantt to the orange line • Drag right edge of bar to resize</span></div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>}
    </section>
  );
}
