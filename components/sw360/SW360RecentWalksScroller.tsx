import Link from "next/link";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { SW360BoundedList } from "@/components/sw360/SW360BoundedList";

export type RecentWalkCard = {
  id: string;
  title: string;
  status: string;
  projectName: string | null;
};

/**
 * Vertical, bounded list (not horizontal scroll — Brian's feedback: no
 * horizontal scrolling sections, no lists that grow and push the rest of
 * Home down). Shows 3 rows, "Show more" expands in place, "See all" routes
 * to the full walks list.
 */
export function SW360RecentWalksScroller({ walks }: { walks: RecentWalkCard[] }) {
  if (walks.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
        Recent walks
      </p>
      <SW360BoundedList itemCount={walks.length} seeAllHref="/sw360/projects" rowHeightPx={52}>
        {walks.map((w) => (
          <Link
            key={w.id}
            href={buildCaptureLaunchUrl({ session: w.id })}
            className="flex shrink-0 items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{w.title}</p>
              {w.projectName ? (
                <p className="truncate text-xs text-[var(--sw360-charcoal)]/60">{w.projectName}</p>
              ) : null}
            </div>
            <span className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--sw360-green-light)]">
              {w.status === "completed" ? "View" : "Resume"}
            </span>
          </Link>
        ))}
      </SW360BoundedList>
    </div>
  );
}
