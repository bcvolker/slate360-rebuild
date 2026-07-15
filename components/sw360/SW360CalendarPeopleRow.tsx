import Link from "next/link";
import { Calendar, Users, ChevronRight } from "lucide-react";

/**
 * Calendar + People are cross-cutting, not project-scoped, so per Brian's
 * feedback they move to the bottom of Home and share one compact row
 * (left = Calendar, right = People) with an arrow into each full screen,
 * rather than two separate strip sections competing for space above the
 * fold.
 */
export function SW360CalendarPeopleRow({
  weekEventCount,
  peopleCount,
}: {
  weekEventCount: number;
  peopleCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/sw360/calendar"
        className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white/70 p-4"
      >
        <div className="flex items-center justify-between">
          <Calendar size={18} className="text-[var(--sw360-green-light)]" />
          <ChevronRight size={14} className="text-[var(--sw360-charcoal)]/40" />
        </div>
        <div className="mt-2">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">This week</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/60">
            {weekEventCount === 0 ? "Nothing scheduled" : `${weekEventCount} event${weekEventCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </Link>
      <Link
        href="/sw360/contacts"
        className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white/70 p-4"
      >
        <div className="flex items-center justify-between">
          <Users size={18} className="text-[var(--sw360-green-light)]" />
          <ChevronRight size={14} className="text-[var(--sw360-charcoal)]/40" />
        </div>
        <div className="mt-2">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">People</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/60">
            {peopleCount === 0 ? "Add your first contact" : `${peopleCount} contact${peopleCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </Link>
    </div>
  );
}
