"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/site-walk/load-calendar-data";
import { CalendarEventSheet } from "@/components/coordination/CalendarEventSheet";
import { MobileEmptyState } from "./MobileEmptyState";
import { mobileTokens } from "./mobileTokens";

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function groupLabel(due: Date, today: Date): string {
  const dayMs = 86_400_000;
  const diff = Math.round((startOfDay(due).getTime() - startOfDay(today).getTime()) / dayMs);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type ApiCalendarEvent = {
  id: string;
  title: string;
  date: string;
  all_day?: boolean;
  location?: string | null;
  projects?: { id: string; name: string } | null;
};

export function MobileCalendarClient({ events = [] }: { events?: CalendarEvent[] }) {
  const [created, setCreated] = useState<CalendarEvent[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { events?: ApiCalendarEvent[] };
      const mapped: CalendarEvent[] = (data.events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        dueDate: e.date,
        projectName: e.projects?.name ?? null,
        status: null,
      }));
      setCreated(mapped);
    } catch {
      /* non-fatal — the passed schedule events still render */
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const all = [...events, ...created];
  const today = new Date();
  const groups: { label: string; overdue: boolean; items: CalendarEvent[] }[] = [];
  const indexByLabel = new Map<string, number>();
  for (const event of all) {
    const due = new Date(event.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    const label = groupLabel(due, today);
    let idx = indexByLabel.get(label);
    if (idx === undefined) {
      idx = groups.length;
      indexByLabel.set(label, idx);
      groups.push({ label, overdue: label === "Overdue", items: [] });
    }
    groups[idx].items.push(event);
  }

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={mobileTokens.mobileEyebrowLabel}>Coordination</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Calendar</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Walks, milestones, and scheduled field work across your projects.
        </p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--app-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] text-sm font-semibold text-[var(--app-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_22%,transparent)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> New event
        </button>
      </section>

      {groups.length === 0 ? (
        <section className={cn(mobileTokens.panelBase, "p-5")}>
          <MobileEmptyState
            icon={CalendarDays}
            title="No upcoming events"
            description="Schedule a walk, inspection, or milestone — tap New event to add one."
          />
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.label} className={cn(mobileTokens.panelBase, "overflow-hidden")}>
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2
                className={cn(
                  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em]",
                  group.overdue ? "text-[var(--destructive)]" : "text-[var(--app-accent)]",
                )}
              >
                {group.label}
              </h2>
              <span className="text-[11px] font-semibold text-zinc-500">{group.items.length}</span>
            </div>
            {group.items.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3"
              >
                <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                  <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {event.projectName ? `${event.projectName} · ` : ""}
                    {new Date(event.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {event.status ? (
                  <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-300">
                    {event.status.replace(/_/g, " ")}
                  </span>
                ) : null}
              </div>
            ))}
          </section>
        ))
      )}

      <CalendarEventSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={loadEvents}
      />
    </div>
  );
}
