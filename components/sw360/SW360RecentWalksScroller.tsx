import Link from "next/link";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";

export type RecentWalkCard = {
  id: string;
  title: string;
  status: string;
  projectName: string | null;
};

/**
 * Replaces the old single "Resume [walk]" banner — Brian: opening the app
 * shouldn't surface one walk the system picked as THE resume target; it
 * should show recent walks across projects so the user picks. Horizontal,
 * contained scroller (own row, doesn't grow the page) rather than a full
 * vertical list, per "a contained scroller so it fits within the screen."
 */
export function SW360RecentWalksScroller({ walks }: { walks: RecentWalkCard[] }) {
  if (walks.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
        Recent walks
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {walks.map((w) => (
          <Link
            key={w.id}
            href={buildCaptureLaunchUrl({ session: w.id })}
            className="flex w-40 shrink-0 flex-col justify-between rounded-xl border border-[var(--border)] bg-white/70 p-3"
          >
            <div>
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{w.title}</p>
              {w.projectName ? (
                <p className="mt-0.5 truncate text-xs text-[var(--sw360-charcoal)]/60">{w.projectName}</p>
              ) : null}
            </div>
            <span className="mt-2 self-start text-[10px] font-bold uppercase tracking-wide text-[var(--sw360-green-light)]">
              {w.status === "completed" ? "View" : "Resume"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
