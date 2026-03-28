"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Download, Loader2, Plus, Search } from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import { type DailyLog, type DailyLogFormData, EMPTY_FORM, parseCrewText, crewToText } from "./_shared";
import DailyLogItem from "./DailyLogItem";
import DailyLogForm from "./DailyLogForm";

export default function DailyLogsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<DailyLogFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<DailyLog | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-daily-logs-${projectId}`, []);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/daily-logs`, { cache: "no-store" });
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => l.log_date.includes(q) || l.summary?.toLowerCase().includes(q) || l.delays?.toLowerCase().includes(q));
  }, [logs, search]);

  const totalCrew = useMemo(() => {
    let sum = 0;
    logs.forEach((l) => { if (l.crew_counts) Object.values(l.crew_counts).forEach((v) => { sum += v; }); });
    return sum;
  }, [logs]);

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.log_date) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        log_date: form.log_date, summary: form.summary || null,
        weather_temp: form.weather_temp ? Number(form.weather_temp) : null,
        weather_condition: form.weather_condition || null, weather_wind: form.weather_wind || null,
        weather_precip: form.weather_precip || null,
        crew_counts: form.crew_text ? parseCrewText(form.crew_text) : null,
        equipment: form.equipment_text ? form.equipment_text.split(",").map((s) => s.trim()).filter(Boolean) : null,
        visitors: form.visitors || null, safety_observations: form.safety_observations || null, delays: form.delays || null,
      };
      if (editingId) payload.id = editingId;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(`/api/projects/${projectId}/daily-logs`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Log updated" : "Log created");
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); await load();
    } catch { setToast("Error saving log"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this daily log?")) return;
    try { await fetch(`/api/projects/${projectId}/daily-logs`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setToast("Log deleted"); await load(); }
    catch { setToast("Error deleting log"); }
  };

  const startEdit = (log: DailyLog) => {
    setForm({ log_date: log.log_date, summary: log.summary ?? "", weather_temp: log.weather_temp != null ? String(log.weather_temp) : "", weather_condition: log.weather_condition ?? "", weather_wind: log.weather_wind ?? "", weather_precip: log.weather_precip ?? "", crew_text: crewToText(log.crew_counts), equipment_text: log.equipment?.join(", ") ?? "", visitors: log.visitors ?? "", safety_observations: log.safety_observations ?? "", delays: log.delays ?? "" });
    setEditingId(log.id); setShowCreate(true);
  };

  const exportCSV = () => {
    const header = ["Date","Summary","Temp","Condition","Wind","Precip","Crew","Equipment","Visitors","Safety","Delays"];
    const csvRows = filtered.map((l) => [l.log_date, l.summary ?? "", l.weather_temp != null ? String(l.weather_temp) : "", l.weather_condition ?? "", l.weather_wind ?? "", l.weather_precip ?? "", l.crew_counts ? Object.entries(l.crew_counts).map(([k, v]) => `${k}:${v}`).join("; ") : "", l.equipment?.join("; ") ?? "", l.visitors ?? "", l.safety_observations ?? "", l.delays ?? ""]);
    const csv = [header, ...csvRows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `daily-logs-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Field Reports</p>
          <h2 className="text-xl font-black text-white">Daily Logs</h2>
          <p className="mt-1 text-sm text-zinc-400">Capture daily site conditions, crew, weather, delays and safety.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={logs.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"><Download size={14} /> Export</button>
          <ViewCustomizer storageKey={`viewprefs-daily-logs-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> New Log Entry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([{ label: "Total Logs", value: logs.length, color: "text-white" }, { label: "This Week", value: logs.filter((l) => { const d = new Date(l.log_date); const now = new Date(); const diff = (now.getTime() - d.getTime()) / 86400000; return diff <= 7; }).length, color: "text-blue-400" }, { label: "Total Crew Count", value: totalCrew, color: "text-emerald-400" }, { label: "Delay Entries", value: logs.filter((l) => l.delays).length, color: "text-amber-400" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"><p className="text-xs font-semibold text-zinc-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by date, summary, delays…" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading daily logs…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-400">No daily logs yet</p>
          <p className="mt-1 text-xs text-zinc-500">Click &quot;New Log Entry&quot; to start recording site activity.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">No logs match your search.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <DailyLogItem
              key={log.id}
              log={log}
              isExpanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              onEdit={startEdit}
              onHistory={setHistoryItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <DailyLogForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => { setShowCreate(false); setEditingId(null); }}
        />
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">{toast}</div>}

      <ChangeHistory
        open={historyItem !== null}
        onClose={() => setHistoryItem(null)}
        title={historyItem ? `Daily Log — ${historyItem.log_date}` : ""}
        entries={historyItem ? buildBaseHistory(historyItem) : []}
        subfolder="Daily Logs"
      />
    </section>
  );
}
