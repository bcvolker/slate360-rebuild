"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Download,
  HardHat,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

/* ---------- helpers ---------- */
function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if ([3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

type DailyLog = {
  id: string;
  log_date: string;
  summary: string | null;
  weather_temp: number | null;
  weather_condition: string | null;
  weather_wind: string | null;
  weather_precip: string | null;
  crew_counts: Record<string, number> | null;
  equipment: string[] | null;
  visitors: string | null;
  safety_observations: string | null;
  delays: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string | null;
};

type FormData = {
  log_date: string;
  summary: string;
  weather_temp: string;
  weather_condition: string;
  weather_wind: string;
  weather_precip: string;
  crew_text: string; // "Trade: count" per line
  equipment_text: string; // comma sep
  visitors: string;
  safety_observations: string;
  delays: string;
};

const EMPTY_FORM: FormData = {
  log_date: new Date().toISOString().slice(0, 10),
  summary: "",
  weather_temp: "",
  weather_condition: "",
  weather_wind: "",
  weather_precip: "",
  crew_text: "",
  equipment_text: "",
  visitors: "",
  safety_observations: "",
  delays: "",
};

function parseCrewText(text: string): Record<string, number> {
  const m: Record<string, number> = {};
  text.split("\n").filter(Boolean).forEach((line) => {
    const parts = line.split(":");
    if (parts.length >= 2) { const k = parts[0].trim(); const v = parseInt(parts[1].trim(), 10); if (k && !isNaN(v)) m[k] = v; }
  });
  return m;
}
function crewToText(crew: Record<string, number> | null): string {
  if (!crew) return "";
  return Object.entries(crew).map(([k, v]) => `${k}: ${v}`).join("\n");
}

export default function DailyLogsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const logCurrentWeather = async () => {
    setLoadingWeather(true);
    if (!navigator.geolocation) { setLoadingWeather(false); setToast("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const c = j?.current_weather;
        if (!c) throw new Error();
        setForm((f) => ({ ...f, weather_temp: String(Math.round(c.temperature)), weather_condition: weatherCodeLabel(Number(c.weathercode ?? -1)), weather_wind: `${c.windspeed} km/h`, weather_precip: "" }));
        setToast("Weather auto-filled");
      } catch { setToast("Unable to fetch weather"); }
      finally { setLoadingWeather(false); }
    }, () => { setLoadingWeather(false); setToast("Location unavailable"); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };

  const handleSubmit = async () => {
    if (!projectId || !form.log_date) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        log_date: form.log_date,
        summary: form.summary || null,
        weather_temp: form.weather_temp ? Number(form.weather_temp) : null,
        weather_condition: form.weather_condition || null,
        weather_wind: form.weather_wind || null,
        weather_precip: form.weather_precip || null,
        crew_counts: form.crew_text ? parseCrewText(form.crew_text) : null,
        equipment: form.equipment_text ? form.equipment_text.split(",").map((s) => s.trim()).filter(Boolean) : null,
        visitors: form.visitors || null,
        safety_observations: form.safety_observations || null,
        delays: form.delays || null,
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

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Field Reports</p>
          <h2 className="text-xl font-black text-gray-900">Daily Logs</h2>
          <p className="mt-1 text-sm text-gray-500">Capture daily site conditions, crew, weather, delays and safety.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={logs.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Download size={14} /> Export</button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition"><Plus size={15} /> New Log Entry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([{ label: "Total Logs", value: logs.length, color: "text-gray-900" }, { label: "This Week", value: logs.filter((l) => { const d = new Date(l.log_date); const now = new Date(); const diff = (now.getTime() - d.getTime()) / 86400000; return diff <= 7; }).length, color: "text-blue-600" }, { label: "Total Crew Count", value: totalCrew, color: "text-emerald-600" }, { label: "Delay Entries", value: logs.filter((l) => l.delays).length, color: "text-amber-600" }] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by date, summary, delays…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading daily logs…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No daily logs yet</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;New Log Entry&quot; to start recording site activity.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No logs match your search.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const isExp = expandedId === log.id;
            const crewTotal = log.crew_counts ? Object.values(log.crew_counts).reduce((a, b) => a + b, 0) : 0;
            return (
              <div key={log.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all">
                <button onClick={() => setExpandedId(isExp ? null : log.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700"><Calendar size={10} /> {log.log_date}</span>
                  <div className="flex-1 min-w-0">
                    <span className="truncate text-sm font-semibold text-gray-900">{log.summary ? (log.summary.length > 80 ? log.summary.slice(0, 80) + "…" : log.summary) : "No summary"}</span>
                  </div>
                  {crewTotal > 0 && <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><HardHat size={10} /> {crewTotal}</span>}
                  {log.weather_condition && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><CloudSun size={10} /> {log.weather_condition}</span>}
                  {isExp ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    {/* Weather card */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2"><CloudSun size={10} className="inline mr-1" />Weather</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div><p className="text-[10px] font-bold uppercase text-blue-400">Temp</p><p className="text-sm font-semibold text-blue-800">{log.weather_temp != null ? `${log.weather_temp}°C` : "—"}</p></div>
                        <div><p className="text-[10px] font-bold uppercase text-blue-400">Condition</p><p className="text-sm font-semibold text-blue-800">{log.weather_condition || "—"}</p></div>
                        <div><p className="text-[10px] font-bold uppercase text-blue-400">Wind</p><p className="text-sm font-semibold text-blue-800">{log.weather_wind || "—"}</p></div>
                        <div><p className="text-[10px] font-bold uppercase text-blue-400">Precip</p><p className="text-sm font-semibold text-blue-800">{log.weather_precip || "—"}</p></div>
                      </div>
                    </div>
                    {/* Summary */}
                    {log.summary && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Summary</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{log.summary}</p></div>}
                    {/* Crew */}
                    {log.crew_counts && Object.keys(log.crew_counts).length > 0 && (
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2"><HardHat size={10} className="inline mr-1" />Crew Counts ({crewTotal} total)</p>
                        <div className="flex flex-wrap gap-2">{Object.entries(log.crew_counts).map(([trade, count]) => (<span key={trade} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{trade}: {count}</span>))}</div>
                      </div>
                    )}
                    {/* Equipment */}
                    {log.equipment && log.equipment.length > 0 && (
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Equipment on Site</p>
                        <div className="flex flex-wrap gap-2">{log.equipment.map((eq, i) => (<span key={i} className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{eq}</span>))}</div>
                      </div>
                    )}
                    {/* Detail rows */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {log.visitors && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Visitors</p><p className="mt-0.5 text-sm text-gray-800">{log.visitors}</p></div>}
                      {log.safety_observations && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Safety Observations</p><p className="mt-0.5 text-sm text-gray-800">{log.safety_observations}</p></div>}
                      {log.delays && <div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Delays</p><p className="mt-0.5 text-sm text-amber-800">{log.delays}</p></div>}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={() => startEdit(log)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                      <button onClick={() => handleDelete(log.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Slide-over */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Log" : "New Daily Log"}</h3>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Date *</label><input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Summary</label><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} placeholder="Overall site activity and progress…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>

              {/* Weather section */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="text-xs font-bold text-blue-700">Weather</p>
                  <button type="button" onClick={logCurrentWeather} disabled={loadingWeather} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                    {loadingWeather ? <Loader2 size={10} className="animate-spin" /> : <MapPin size={10} />} Auto-fill
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Temp (°C)</label><input type="number" value={form.weather_temp} onChange={(e) => setForm({ ...form, weather_temp: e.target.value })} className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm outline-none" /></div>
                  <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Condition</label><input type="text" value={form.weather_condition} onChange={(e) => setForm({ ...form, weather_condition: e.target.value })} placeholder="Clear, Rain, etc." className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm outline-none" /></div>
                  <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Wind</label><input type="text" value={form.weather_wind} onChange={(e) => setForm({ ...form, weather_wind: e.target.value })} placeholder="10 km/h" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm outline-none" /></div>
                  <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Precipitation</label><input type="text" value={form.weather_precip} onChange={(e) => setForm({ ...form, weather_precip: e.target.value })} placeholder="None, 5mm, etc." className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm outline-none" /></div>
                </div>
              </div>

              <div><label className="mb-1 block text-xs font-bold text-gray-700">Crew Counts (one per line: Trade: count)</label><textarea value={form.crew_text} onChange={(e) => setForm({ ...form, crew_text: e.target.value })} rows={3} placeholder={"Electricians: 4\nPlumbers: 2\nIronworkers: 6"} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Equipment on Site (comma separated)</label><input type="text" value={form.equipment_text} onChange={(e) => setForm({ ...form, equipment_text: e.target.value })} placeholder="Crane, Excavator, Boom Lift" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Visitors</label><input type="text" value={form.visitors} onChange={(e) => setForm({ ...form, visitors: e.target.value })} placeholder="Inspector, Owner rep, etc." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Safety Observations</label><textarea value={form.safety_observations} onChange={(e) => setForm({ ...form, safety_observations: e.target.value })} rows={2} placeholder="Any safety items noted on site…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>
              <div><label className="mb-1 block text-xs font-bold text-gray-700">Delays</label><textarea value={form.delays} onChange={(e) => setForm({ ...form, delays: e.target.value })} rows={2} placeholder="Weather delays, material shortages, etc." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" /></div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.log_date} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Update Log" : "Save Daily Log"}</button>
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
