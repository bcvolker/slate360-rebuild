"use client";

import { Calendar, ChevronDown, ChevronUp, CloudSun, HardHat, History, Trash2 } from "lucide-react";
import type { DailyLog } from "./_shared";

interface Props {
  log: DailyLog;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (log: DailyLog) => void;
  onHistory: (log: DailyLog) => void;
  onDelete: (id: string) => void;
}

export default function DailyLogItem({ log, isExpanded, onToggle, onEdit, onHistory, onDelete }: Props) {
  const crewTotal = log.crew_counts ? Object.values(log.crew_counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden transition-all">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-800/50 transition">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400"><Calendar size={10} /> {log.log_date}</span>
        <div className="flex-1 min-w-0">
          <span className="truncate text-sm font-semibold text-white">{log.summary ? (log.summary.length > 80 ? log.summary.slice(0, 80) + "…" : log.summary) : "No summary"}</span>
        </div>
        {crewTotal > 0 && <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400"><HardHat size={10} /> {crewTotal}</span>}
        {log.weather_condition && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400"><CloudSun size={10} /> {log.weather_condition}</span>}
        {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 bg-zinc-800/30 p-4 space-y-4">
          {/* Weather card */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2"><CloudSun size={10} className="inline mr-1" />Weather</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-[10px] font-bold uppercase text-blue-500">Temp</p><p className="text-sm font-semibold text-blue-300">{log.weather_temp != null ? `${log.weather_temp}°C` : "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-blue-500">Condition</p><p className="text-sm font-semibold text-blue-300">{log.weather_condition || "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-blue-500">Wind</p><p className="text-sm font-semibold text-blue-300">{log.weather_wind || "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-blue-500">Precip</p><p className="text-sm font-semibold text-blue-300">{log.weather_precip || "—"}</p></div>
            </div>
          </div>
          {log.summary && <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Summary</p><p className="text-sm text-zinc-300 whitespace-pre-wrap">{log.summary}</p></div>}
          {log.crew_counts && Object.keys(log.crew_counts).length > 0 && (
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2"><HardHat size={10} className="inline mr-1" />Crew Counts ({crewTotal} total)</p>
              <div className="flex flex-wrap gap-2">{Object.entries(log.crew_counts).map(([trade, count]) => (<span key={trade} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">{trade}: {count}</span>))}</div>
            </div>
          )}
          {log.equipment && log.equipment.length > 0 && (
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Equipment on Site</p>
              <div className="flex flex-wrap gap-2">{log.equipment.map((eq, i) => (<span key={i} className="inline-flex rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">{eq}</span>))}</div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {log.visitors && <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Visitors</p><p className="mt-0.5 text-sm text-zinc-300">{log.visitors}</p></div>}
            {log.safety_observations && <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Safety Observations</p><p className="mt-0.5 text-sm text-zinc-300">{log.safety_observations}</p></div>}
            {log.delays && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Delays</p><p className="mt-0.5 text-sm text-amber-300">{log.delays}</p></div>}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => onEdit(log)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition">Edit</button>
            <button onClick={() => onHistory(log)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 transition"><History size={12} /> History</button>
            <button onClick={() => onDelete(log.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/40 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition ml-auto"><Trash2 size={12} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
