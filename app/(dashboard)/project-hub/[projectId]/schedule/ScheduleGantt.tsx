"use client";

import { Calendar, Flag, Loader2 } from "lucide-react";
import { type TaskRow, STATUS_COLORS, PRIORITY_DOT, TASK_ROW_H, LEFT_W, MS_DAY, fmtYMD } from "./_shared";

interface Props {
  rows: TaskRow[];
  loading: boolean;
  ganttStart: Date;
  totalDays: number;
  monthGroups: { label: string; span: number; startDay: number }[];
  dayNumbers: Date[];
  todayOffsetPx: number;
  dayW: number;
  dragEndMs: Record<string, number>;
  onEdit: (task: TaskRow) => void;
  onResizeStart: (e: React.MouseEvent, task: TaskRow) => void;
}

export default function ScheduleGantt({ rows, loading, ganttStart, totalDays, monthGroups, dayNumbers, todayOffsetPx, dayW, dragEndMs, onEdit, onResizeStart }: Props) {
  const getBar = (task: TaskRow) => {
    if (!task.start_date || !task.end_date) return null;
    const startMs = new Date(task.start_date).getTime();
    const rawEndMs = dragEndMs[task.id] ?? new Date(task.end_date).getTime();
    return { left: ((startMs - ganttStart.getTime()) / MS_DAY) * dayW, width: Math.max(dayW, ((rawEndMs - startMs) / MS_DAY) * dayW) };
  };

  const BADGE_ICON: Record<string, string> = { Completed: "✓", Delayed: "!", "In Progress": "▶", "On Hold": "⏸" };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden select-none">
      {loading ? (
        <div className="p-12 text-center text-sm text-zinc-400"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading schedule...</div>
      ) : (
        <div className="flex">
          {/* Left fixed panel */}
          <div className="shrink-0 border-r border-zinc-800" style={{ width: LEFT_W }}>
            <div className="sticky top-0 z-10 bg-zinc-800/50 border-b border-zinc-800 px-3 flex items-center" style={{ height: 64 }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task</span>
            </div>
            {rows.length === 0 ? (
              <div className="p-6 text-center"><Calendar size={28} className="mx-auto mb-2 text-zinc-600" /><p className="text-xs text-zinc-500 font-semibold">No tasks yet</p><p className="text-[10px] text-zinc-500 mt-1">Click &quot;Add Task&quot; to begin.</p></div>
            ) : rows.map((task) => (
              <div key={task.id} className="flex items-center gap-2 px-3 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer" style={{ height: TASK_ROW_H }} onClick={() => onEdit(task)}>
                {task.is_milestone ? <Flag size={11} className="text-purple-400 shrink-0" /> : <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-zinc-500"}`} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-200">{task.name}</p>
                  <p className="text-[9px] text-zinc-500 truncate">{task.assigned_to ?? ""}{task.start_date ? ` · ${new Date(task.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
                </div>
                <span className={`shrink-0 inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${(STATUS_COLORS[task.status] ?? STATUS_COLORS["Not Started"]).badge}`}>{BADGE_ICON[task.status] ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Right scrollable Gantt */}
          <div className="flex-1 overflow-x-auto" style={{ minWidth: 0 }}>
            <div style={{ width: totalDays * dayW, minWidth: "100%" }}>
              <div className="sticky top-0 z-10 bg-zinc-800/50 border-b border-zinc-800 flex" style={{ height: 32 }}>
                {monthGroups.map((mg) => <div key={`${mg.label}-${mg.startDay}`} className="flex items-center justify-center border-r border-zinc-700 text-[9px] font-bold uppercase tracking-wider text-zinc-500" style={{ width: mg.span * dayW, minWidth: mg.span * dayW }}>{mg.label}</div>)}
              </div>
              <div className="sticky top-8 z-10 bg-zinc-900 border-b border-zinc-800 flex" style={{ height: 32 }}>
                {dayNumbers.map((d, i) => {
                  const dow = d.getDay(); const isWE = dow === 0 || dow === 6; const isToday = fmtYMD(d) === fmtYMD(new Date());
                  return <div key={i} className={`flex items-center justify-center shrink-0 border-r border-zinc-800/50 text-[8px] font-semibold ${isToday ? "bg-[#FF4D00]/10 text-[#FF4D00] font-black" : isWE ? "bg-zinc-800/40 text-zinc-600" : "text-zinc-500"}`} style={{ width: dayW, minWidth: dayW }} title={d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}>{dayW >= 24 ? d.getDate() : ""}</div>;
                })}
              </div>
              <div className="relative">
                {dayNumbers.map((d, i) => { const dow = d.getDay(); if (dow !== 0 && dow !== 6) return null; return <div key={`ws-${i}`} className="absolute top-0 bottom-0 bg-zinc-800/30 pointer-events-none" style={{ left: i * dayW, width: dayW }} />; })}
                {todayOffsetPx >= 0 && todayOffsetPx <= totalDays * dayW && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-[#FF4D00] z-20 pointer-events-none" style={{ left: todayOffsetPx }}><div className="absolute -top-0 -left-1.5 w-3 h-3 rounded-full bg-[#FF4D00]" /></div>
                )}
                {rows.length === 0 && <div style={{ height: 120 }} className="flex items-center justify-center"><p className="text-xs text-zinc-600">Add tasks to see them here</p></div>}
                {rows.map((task) => {
                  const bar = getBar(task); const pct = task.percent_complete ?? 0; const colors = STATUS_COLORS[task.status] ?? STATUS_COLORS["Not Started"];
                  return (
                    <div key={task.id} className="relative border-b border-zinc-800/50" style={{ height: TASK_ROW_H }}>
                      {bar && !task.is_milestone && (
                        <div className="absolute top-1/2 -translate-y-1/2 rounded-md flex items-center group/bar cursor-pointer shadow-sm overflow-visible" style={{ left: bar.left, width: bar.width, height: 22 }} onClick={() => onEdit(task)} title={`${task.name} — ${task.status} (${pct}%)`}>
                          <div className={`absolute inset-0 rounded-md opacity-20 ${colors.bar}`} />
                          <div className={`absolute top-0 left-0 bottom-0 rounded-md ${colors.bar}`} style={{ width: `${pct}%` }} />
                          {bar.width > 48 && <span className="relative z-10 px-2 text-[9px] font-bold text-white drop-shadow truncate">{pct}%</span>}
                          <div className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-20 opacity-0 group-hover/bar:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, task); }}><div className="w-1 h-3 rounded-full bg-white/80" /></div>
                        </div>
                      )}
                      {bar && task.is_milestone && <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-purple-500 rounded-sm shadow cursor-pointer" style={{ left: bar.left - 8 }} onClick={() => onEdit(task)} title={task.name} />}
                      {!bar && <div className="absolute inset-0 flex items-center pl-3"><span className="text-[9px] text-zinc-600 italic">No dates set</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
