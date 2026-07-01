"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-fill the project when opened from inside a project. */
  projectId?: string | null;
};

const field =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[color-mix(in_srgb,var(--app-accent)_45%,transparent)]";
const label = "font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]";

function todayIso(): string {
  // Local YYYY-MM-DD without pulling Date.now semantics into render paths.
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Create a real calendar event against POST /api/calendar (calendar_events).
 * Mobile bottom sheet + desktop-friendly centered dialog (same component).
 */
export function CalendarEventSheet({ open, onClose, onCreated, projectId }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setDate(todayIso());
    setAllDay(true);
    setStartTime("");
    setEndTime("");
    setLocation("");
    setNotes("");
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Add a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          all_day: allDay,
          start_time: allDay ? null : startTime || null,
          end_time: allDay ? null : endTime || null,
          location: location.trim() || null,
          description: notes.trim() || null,
          project_id: projectId ?? null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Couldn't save the event. Try again.");
        return;
      }
      reset();
      onCreated();
      onClose();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="New event"
        className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-[var(--shell-chrome-surface,#11161E)] p-5 shadow-2xl sm:rounded-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className={label}>New event</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            className={field}
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3">
            <span className="text-sm text-white">All day</span>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-5 w-5 accent-[var(--app-accent)]"
            />
          </label>

          {!allDay ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                className={field}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="Start time"
              />
              <input
                className={field}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="End time"
              />
            </div>
          ) : null}

          <input
            className={field}
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className={cn(field, "h-20 resize-none py-2")}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] text-sm font-semibold text-[var(--app-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_22%,transparent)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save event"}
          </button>
        </div>
      </div>
    </div>
  );
}
