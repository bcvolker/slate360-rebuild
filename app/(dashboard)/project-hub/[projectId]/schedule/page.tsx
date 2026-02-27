"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type TaskRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  percent_complete: number;
  assigned_to: string | null;
  priority: string;
  notes: string | null;
  is_milestone: boolean;
  created_at: string;
  updated_at: string | null;
};

type FormData = {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  percentComplete: string;
  assignedTo: string;
  priority: string;
  notes: string;
  isMilestone: boolean;
};

const STATUSES = ["Not Started", "In Progress", "Completed", "On Hold", "Delayed"];
const PRIORITIES = ["Low", "Normal", "High", "Critical"];

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-200",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200",
  Delayed: "bg-red-100 text-red-700 border-red-200",
};

const EMPTY_FORM: FormData = {
  name: "",
  startDate: "",
  endDate: "",
  status: "Not Started",
  percentComplete: "0",
  assignedTo: "",
  priority: "Normal",
  notes: "",
  isMilestone: false,
};

/* ── Helpers ────────────────────────────────────────────────────── */
function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function ProjectSchedulePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [toast, setToast] = useState<string | null>(null);

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, { cache: "no-store" });
      const payload = await res.json();
      setRows(Array.isArray(payload.tasks) ? payload.tasks : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  /* ── Filtered ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.assigned_to?.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    return list;
  }, [rows, search, filterStatus]);

  /* ── Stats ────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "Completed").length;
    const inProgress = rows.filter((r) => r.status === "In Progress").length;
    const delayed = rows.filter((r) => r.status === "Delayed").length;
    const milestones = rows.filter((r) => r.is_milestone).length;
    const avgProgress = total > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.percent_complete ?? 0), 0) / total) : 0;
    return { total, completed, inProgress, delayed, milestones, avgProgress };
  }, [rows]);

  /* ── Timeline range ───────────────────────────────────────────── */
  const timelineRange = useMemo(() => {
    const datesWithValues = rows.filter((r) => r.start_date && r.end_date);
    if (datesWithValues.length === 0) return null;
    const starts = datesWithValues.map((r) => new Date(r.start_date!).getTime());
    const ends = datesWithValues.map((r) => new Date(r.end_date!).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const span = max - min || 86400000;
    return { min, max, span };
  }, [rows]);

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.name.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Task updated" : "Task added");
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM);
      await load();
    } catch { setToast("Error saving task"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this task?")) return;
    try {
      await fetch(`/api/projects/${projectId}/schedule`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Task deleted"); await load();
    } catch { setToast("Error deleting"); }
  };

  const startEdit = (row: TaskRow) => {
    setForm({
      name: row.name, startDate: row.start_date ?? "", endDate: row.end_date ?? "",
      status: row.status, percentComplete: String(row.percent_complete ?? 0),
      assignedTo: row.assigned_to ?? "", priority: row.priority ?? "Normal",
      notes: row.notes ?? "", isMilestone: row.is_milestone ?? false,
    });
    setEditingId(row.id); setShowCreate(true);
  };

  const quickStatus = async (task: TaskRow, newStatus: string) => {
    if (!projectId) return;
    const pct = newStatus === "Completed" ? 100 : task.percent_complete;
    try {
      await fetch(`/api/projects/${projectId}/schedule`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus, percentComplete: pct }),
      });
      setToast(`Marked ${newStatus}`); await load();
    } catch { setToast("Error updating"); }
  };

  /* ── Export ───────────────────────────────────────────────────── */
  const exportCSV = () => {
    const csvRows = [
      ["Task", "Start", "End", "Status", "% Complete", "Assigned To", "Priority", "Milestone", "Notes"],
      ...filtered.map((r) => [r.name, r.start_date ?? "", r.end_date ?? "", r.status, String(r.percent_complete), r.assigned_to ?? "", r.priority, r.is_milestone ? "Yes" : "No", r.notes ?? ""]),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `schedule-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); setToast("Schedule exported");
  };

  const onSaveSnapshot = async () => {
    if (!projectId || rows.length === 0) return;
    setSnapshotSaving(true);
    try {
      const csvRows = [["Task","Start","End","Status","% Complete"], ...rows.map((r) => [r.name, r.start_date ?? "", r.end_date ?? "", r.status, String(r.percent_complete)])];
      const csv = csvRows.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const file = new File([csv], `schedule-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, { type: "text/csv" });
      const fd = new FormData(); fd.set("file", file);
      const res = await fetch(`/api/projects/${projectId}/schedule/snapshot`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setToast("Snapshot saved");
    } catch { setToast("Error saving snapshot"); }
    finally { setSnapshotSaving(false); }
  };

  if (!projectId) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;
  }

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
          <h2 className="text-xl font-black text-gray-900">Schedule & Tasks</h2>
          <p className="mt-1 text-sm text-gray-500">Plan tasks, set milestones, and track progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => void onSaveSnapshot()} disabled={snapshotSaving || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">{snapshotSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Snapshot</button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> Add Task</button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-gray-900" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
          { label: "Delayed", value: stats.delayed, color: "text-red-600" },
          { label: "Milestones", value: stats.milestones, color: "text-purple-600" },
          { label: "Avg Progress", value: `${stats.avgProgress}%`, color: "text-gray-900" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white">
          <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "table" ? "bg-[#FF4D00] text-white rounded-lg" : "text-gray-700"}`}>Table</button>
          <button onClick={() => setViewMode("timeline")} className={`px-3 py-2 text-xs font-semibold transition ${viewMode === "timeline" ? "bg-[#FF4D00] text-white rounded-lg" : "text-gray-700"}`}>Timeline</button>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}><Filter size={14} /> Filters</button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Table View ──────────────────────────────────────────── */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading schedule…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">No tasks yet</p>
              <p className="mt-1 text-xs text-gray-400">Click &quot;Add Task&quot; to start building your schedule.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const dur = row.start_date && row.end_date ? `${daysBetween(row.start_date, row.end_date)}d` : "—";
                    const pct = row.percent_complete ?? 0;
                    const isExpanded = expandedId === row.id;
                    return (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.is_milestone && <Flag size={12} className="text-purple-500 shrink-0" />}
                            <span className="font-semibold text-gray-800">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{row.start_date ? new Date(row.start_date).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{row.end_date ? new Date(row.end_date).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{dur}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>{row.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{row.assigned_to || "—"}</td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => startEdit(row)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(row.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
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

      {/* ── Timeline View ───────────────────────────────────────── */}
      {viewMode === "timeline" && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading…</div>
          ) : !timelineRange ? (
            <div className="p-8 text-center text-sm text-gray-500">Add tasks with start and end dates to see the timeline.</div>
          ) : (
            <div className="p-4 space-y-2">
              {filtered.filter((r) => r.start_date && r.end_date).map((row) => {
                const start = new Date(row.start_date!).getTime();
                const end = new Date(row.end_date!).getTime();
                const leftPct = ((start - timelineRange.min) / timelineRange.span) * 100;
                const widthPct = Math.max(2, ((end - start) / timelineRange.span) * 100);
                const pct = row.percent_complete ?? 0;

                return (
                  <div key={row.id} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 truncate text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      {row.is_milestone && <Flag size={11} className="text-purple-500" />}
                      {row.name}
                    </div>
                    <div className="flex-1 relative h-7 rounded-md bg-gray-100">
                      <div
                        className={`absolute top-0.5 h-6 rounded-md ${row.status === "Completed" ? "bg-emerald-200" : row.status === "Delayed" ? "bg-red-200" : "bg-blue-200"}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        <div
                          className={`h-full rounded-md ${row.status === "Completed" ? "bg-emerald-500" : row.status === "Delayed" ? "bg-red-400" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">{pct}%</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>{row.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Slide-over ────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Task" : "Add Task"}</h3>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Task Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter task name…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Calendar size={11} className="mr-1 inline" /> Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Calendar size={11} className="mr-1 inline" /> End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">% Complete</label>
                  <input type="number" min="0" max="100" value={form.percentComplete} onChange={(e) => setForm({ ...form, percentComplete: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><User size={11} className="mr-1 inline" /> Assigned To</label>
                  <input type="text" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isMilestone" checked={form.isMilestone} onChange={(e) => setForm({ ...form, isMilestone: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="isMilestone" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Flag size={13} className="text-purple-500" /> Mark as Milestone</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Task notes…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] resize-none" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? "Update Task" : "Add Task"}
                </button>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>}
    </section>
  );
}
