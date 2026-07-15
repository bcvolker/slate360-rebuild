import Link from "next/link";
import { Calendar, Users, ChevronRight } from "lucide-react";

/**
 * Calendar + People are cross-cutting, not project-scoped, so per Brian's
 * feedback they move to the bottom of Home and share one compact row
 * (left = Schedule, right = People) with an arrow into each full screen.
 * "This week" renamed to "Schedule" (ambiguous label) per Brian's feedback;
 * strengthened contrast with a solid icon badge + bolder border after the
 * earlier subtle tint read as still too washed out.
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
        className="flex flex-col justify-between rounded-2xl border border-[var(--sw360-charcoal)]/20 bg-[var(--sw360-silver)]/40 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sw360-charcoal)]/90">
            <Calendar size={16} className="text-white" />
          </span>
          <ChevronRight size={16} className="text-[var(--sw360-charcoal)]/50" />
        </div>
        <div className="mt-3">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Schedule</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/70">
            {weekEventCount === 0 ? "Nothing scheduled" : `${weekEventCount} event${weekEventCount === 1 ? "" : "s"} this week`}
          </p>
        </div>
      </Link>
      <Link
        href="/sw360/contacts"
        className="flex flex-col justify-between rounded-2xl border border-[var(--sw360-charcoal)]/20 bg-[var(--sw360-silver)]/40 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sw360-charcoal)]/90">
            <Users size={16} className="text-white" />
          </span>
          <ChevronRight size={16} className="text-[var(--sw360-charcoal)]/50" />
        </div>
        <div className="mt-3">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">People</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/70">
            {peopleCount === 0 ? "Add your first contact" : `${peopleCount} contact${peopleCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </Link>
    </div>
  );
}
