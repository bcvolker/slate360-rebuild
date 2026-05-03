"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type CalendarEvent = {
  id: string; title: string; date: string; start_time: string | null;
  end_time: string | null; description: string | null; location: string | null;
  color: string | null; all_day: boolean;
  projects?: { id: string; name: string } | null;
};

function toKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function CalendarClient() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", date: "", description: "", location: "", all_day: true, start_time: "", end_time: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${toKey(year, month)}`);
      if (res.ok) {
        const j = (await res.json()) as { events?: CalendarEvent[] };
        setEvents(j.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (!form.date) { setFormError("Date is required"); return; }
    setSaving(true); setFormError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, all_day: form.all_day }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save");
      }
      setOpen(false);
      setForm({ title: "", date: "", description: "", location: "", all_day: true, start_time: "", end_time: "" });
      router.refresh();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      {/* Month navigation */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between gap-2">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-black text-white">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>

      {/* Events list */}
      {loading ? (
        <GlassCard className="py-10 text-center">
          <p className="text-sm text-slate-400">Loading…</p>
        </GlassCard>
      ) : sorted.length === 0 ? (
        <GlassCard className="py-12 text-center border-dashed">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 font-black text-slate-300">No events in {MONTHS[month]}</p>
          <p className="mt-1 text-xs text-slate-500">Add deadlines, site inspections, and project milestones.</p>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 flex items-center gap-1.5 mx-auto rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Event
          </button>
        </GlassCard>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{sorted.length} event{sorted.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {sorted.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-xl text-center" style={{ backgroundColor: ev.color ?? "#D4AF37" }}>
                  <span className="text-[10px] font-black leading-none text-slate-950">{new Date(ev.date + "T12:00:00").toLocaleDateString("en-US",{month:"short"})}</span>
                  <span className="text-sm font-black leading-none text-slate-950">{new Date(ev.date + "T12:00:00").getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-50 truncate">{ev.title}</p>
                  {ev.projects?.name && <p className="text-xs text-slate-400 truncate">{ev.projects.name}</p>}
                  {ev.location && <p className="text-xs text-slate-500 truncate">{ev.location}</p>}
                  {!ev.all_day && ev.start_time && (
                    <p className="text-xs text-amber-400">{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ""}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Event modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-white">New Event</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <ModalField label="Title *" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
              <ModalField label="Date *" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
              <ModalField label="Location" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} />
              <ModalField label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <input type="checkbox" checked={!form.all_day} onChange={(e) => setForm((p) => ({ ...p, all_day: !e.target.checked }))} className="accent-amber-500" />
                Add time
              </label>
              {!form.all_day && (
                <div className="flex gap-2">
                  <div className="flex-1"><ModalField label="Start" type="time" value={form.start_time} onChange={(v) => setForm((p) => ({ ...p, start_time: v }))} /></div>
                  <div className="flex-1"><ModalField label="End" type="time" value={form.end_time} onChange={(v) => setForm((p) => ({ ...p, end_time: v }))} /></div>
                </div>
              )}
              {formError && <p className="text-xs font-bold text-red-400">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-2xl border border-slate-700/60 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ModalField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700/60 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/60 focus:outline-none"
      />
    </div>
  );
}
