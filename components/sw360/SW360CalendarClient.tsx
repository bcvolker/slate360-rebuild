"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CalendarEventSheet } from "@/components/coordination/CalendarEventSheet";

export type SW360CalendarEvent = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  projectName: string | null;
};

function dateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Reuses CalendarEventSheet as-is for creation (it POSTs to /api/calendar
 * itself). This client component only owns the list + refresh-after-create.
 */
export function SW360CalendarClient({ initialEvents }: { initialEvents: SW360CalendarEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((e) => e.date >= today);
  }, [events]);
  const past = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((e) => e.date < today);
  }, [events]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const body = (await res.json()) as {
          events?: Array<{ id: string; title: string; date: string; location: string | null; projects?: { name: string } | null }>;
        };
        setEvents(
          (body.events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            location: e.location,
            projectName: e.projects?.name ?? null,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white"
      >
        <Plus size={16} /> New event
      </button>

      {loading ? <p className="text-xs text-[var(--sw360-charcoal)]/50">Refreshing…</p> : null}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
          Upcoming
        </p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--sw360-charcoal)]/60">Nothing scheduled yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((e) => (
              <div key={e.id} className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{e.title}</p>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                    {dateLabel(e.date)}
                  </span>
                </div>
                {e.location || e.projectName ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--sw360-charcoal)]/50">
                    {[e.projectName, e.location].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Past
          </p>
          <div className="flex flex-col gap-2 opacity-60">
            {past.slice(0, 10).map((e) => (
              <div key={e.id} className="rounded-xl border border-[var(--border)] bg-white/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{e.title}</p>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                    {dateLabel(e.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CalendarEventSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => void refresh()}
      />
    </div>
  );
}
