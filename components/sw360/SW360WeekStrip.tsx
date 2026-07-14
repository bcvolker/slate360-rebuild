import Link from "next/link";
import type { WeekStripEvent } from "@/lib/sw360/load-home-strips";

/**
 * Always renders (with an empty-state CTA) rather than hiding when empty —
 * per rev 7 lock (Q1): Home's remaining space should stay purposeful on a
 * light account, not collapse away.
 */
export function SW360WeekStrip({ events }: { events: WeekStripEvent[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
          This week
        </p>
        <Link href="/sw360/calendar" className="text-xs font-bold text-[var(--sw360-green-light)]">
          Full calendar
        </Link>
      </div>
      {events.length === 0 ? (
        <Link
          href="/sw360/calendar"
          className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-5"
        >
          <p className="text-sm text-[var(--sw360-charcoal)]/60">
            Nothing scheduled — add a milestone or site visit.
          </p>
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{e.title}</p>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                {e.dateLabel}{e.projectName ? ` · ${e.projectName}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
