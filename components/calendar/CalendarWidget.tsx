"use client";

/**
 * CalendarWidget — full-featured calendar dashboard widget.
 *
 * - Supabase-backed events via /api/calendar (replaces localStorage)
 * - Add event with title, start/end time, color, project, description
 * - Delete events
 * - Project filter
 * - Integrates with WidgetCard shell
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color: string;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  project?: string | null; // project name
  project_id?: string | null;
  all_day?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Props {
  span?: string;
  widgetSize: WidgetSize;
  widgetColor: string;
  onSetSize?: (size: WidgetSize) => void;
  projects?: Project[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_COLORS = [
  "#3B82F6","#3B82F6","#10B981","#8B5CF6","#3B82F6","#EF4444","#06B6D4","#EC4899",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { day: number; inMonth: boolean; dateStr: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, inMonth: false, dateStr: `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}` });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, inMonth: false, dateStr: `${year}-${String(month + 2).padStart(2,"0")}-${String(i).padStart(2,"0")}` });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function CalendarWidget({ span, widgetSize, widgetColor, onSetSize, projects = [] }: Props) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calSelected, setCalSelected] = useState<string | null>(todayStr);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Add-event form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(todayStr);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formColor, setFormColor] = useState(EVENT_COLORS[0]);
  const [formProjectId, setFormProjectId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const calDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const monthKey = `${calYear}-${String(calMonth + 1).padStart(2,"0")}`;

  /* Fetch events for current month */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${monthKey}`);
      if (res.ok) {
        const { events: raw } = await res.json() as { events: Array<{
          id: string; title: string; date: string; color: string;
          start_time?: string | null; end_time?: string | null;
          description?: string | null; project_id?: string | null; all_day?: boolean;
          projects?: { name: string } | null;
        }> };
        setEvents(raw.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          color: e.color,
          start_time: e.start_time,
          end_time: e.end_time,
          description: e.description,
          project_id: e.project_id,
          project: e.projects?.name ?? null,
          all_day: e.all_day,
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  /* Navigate months */
  const prevMonth = useCallback(() => {
    setCalMonth((m) => { if (m === 0) { setCalYear((y) => y - 1); return 11; } return m - 1; });
    setCalSelected(null);
  }, []);

  const nextMonth = useCallback(() => {
    setCalMonth((m) => { if (m === 11) { setCalYear((y) => y + 1); return 0; } return m + 1; });
    setCalSelected(null);
  }, []);

  /* Add event */
  const handleAddEvent = useCallback(async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          date: formDate || calSelected || todayStr,
          start_time: formAllDay ? null : formStartTime,
          end_time: formAllDay ? null : formEndTime,
          color: formColor,
          project_id: formProjectId || null,
          description: formDesc || null,
          all_day: formAllDay,
        }),
      });
      if (res.ok) {
        const { event } = await res.json() as { event: CalEvent & { projects?: { name: string } | null } };
        const projectName = projects.find((p) => p.id === formProjectId)?.name ?? null;
        setEvents((prev) => [...prev, { ...event, project: projectName }]);
        setFormTitle("");
        setFormDesc("");
        setFormStartTime("09:00");
        setFormEndTime("10:00");
        setFormProjectId("");
        setFormAllDay(false);
        setAddingEvent(false);
      }
    } finally {
      setSaving(false);
    }
  }, [formTitle, formDate, formStartTime, formEndTime, formColor, formProjectId, formDesc, formAllDay, calSelected, todayStr, projects]);

  /* Delete event */
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const selectedDayEvents = useMemo(
    () => (calSelected ? events.filter((e) => e.date === calSelected) : events.slice(0, 8)),
    [calSelected, events]
  );

  return (
    <WidgetCard
      key="calendar"
      icon={CalendarIcon}
      title="Calendar"
      span={span}
      delay={150}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <button
          onClick={() => {
            setAddingEvent(true);
            setFormDate(calSelected ?? todayStr);
          }}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:underline"
        >
          <Plus size={13} /> Add event
        </button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">

        {/* -------- Calendar grid -------- */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900">
              {MONTHS[calMonth]} {calYear}
            </h4>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] text-gray-400 font-semibold py-2">{d}</div>
              ))}
              {calDays.map((cell, i) => {
                const hasEvents = events.some((e) => e.date === cell.dateStr);
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === calSelected;
                return (
                  <button
                    key={i}
                    onClick={() => setCalSelected(cell.dateStr === calSelected ? null : cell.dateStr)}
                    className={`relative h-9 rounded-lg text-xs font-medium transition-all
                      ${!cell.inMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                      ${isToday && !isSelected ? "bg-[#3B82F6]/10 text-[#3B82F6] font-bold" : ""}
                      ${isSelected ? "bg-[#3B82F6] text-foreground font-bold shadow-sm" : ""}
                    `}
                  >
                    {cell.day}
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#3B82F6]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* -------- Sidebar: events + add form -------- */}
        <div className="lg:w-64 lg:border-l lg:border-gray-100 lg:pl-6">
          <h4 className="text-xs font-bold text-gray-900 mb-3">
            {isClient && calSelected
              ? new Date(calSelected + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
              : "Upcoming events"
            }
          </h4>

          {/* Add event form */}
          {addingEvent && (
            <div className="mb-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
              <input
                autoFocus
                type="text"
                placeholder="Event title…"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
              />

              {/* Date */}
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] bg-white"
              />

              {/* All day toggle */}
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="accent-[#3B82F6]"
                />
                All-day event
              </label>

              {/* Times */}
              {!formAllDay && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Start</p>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">End</p>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Project */}
              {projects.length > 0 && (
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] bg-white"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              {/* Description */}
              <textarea
                rows={2}
                placeholder="Notes (optional)…"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] resize-none"
              />

              {/* Color picker */}
              <div className="flex gap-1.5 flex-wrap">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${formColor === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddEvent}
                  disabled={!formTitle.trim() || saving}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg text-foreground disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#3B82F6" }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Save"}
                </button>
                <button
                  onClick={() => setAddingEvent(false)}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Event list */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 leading-snug truncate">{ev.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {isClient ? new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                    {ev.start_time && !ev.all_day && ` · ${ev.start_time}${ev.end_time ? `–${ev.end_time}` : ""}`}
                    {ev.project && ` · ${ev.project}`}
                  </p>
                  {ev.description && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{ev.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-300 hover:text-red-400"
                >
                  {deletingId === ev.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Trash2 size={11} />
                  }
                </button>
              </div>
            ))}
            {selectedDayEvents.length === 0 && !addingEvent && (
              <div className="text-center py-6">
                <CalendarIcon size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">
                  {calSelected ? "No events this day" : "No upcoming events"}
                </p>
                <button
                  onClick={() => { setFormDate(calSelected ?? todayStr); setAddingEvent(true); }}
                  className="mt-2 text-[11px] font-semibold text-[#3B82F6] hover:underline"
                >
                  + Add event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
