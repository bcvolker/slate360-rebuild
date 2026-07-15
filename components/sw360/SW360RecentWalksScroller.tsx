import Link from "next/link";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { SW360ExpandableSection } from "@/components/sw360/SW360ExpandableSection";

export type RecentWalkCard = {
  id: string;
  title: string;
  status: string;
  projectName: string | null;
};

/**
 * Full-width divided rows inside one bounded, tinted container — not
 * individual pill cards (Brian's feedback: pills were "extremely
 * distracting"). Expand/collapse via SW360ExpandableSection.
 */
export function SW360RecentWalksScroller({ walks }: { walks: RecentWalkCard[] }) {
  if (walks.length === 0) return null;

  return (
    <SW360ExpandableSection title="Recent walks" itemCount={walks.length} rowHeightPx={56}>
      {walks.map((w, i) => (
        <Link
          key={w.id}
          href={buildCaptureLaunchUrl({ session: w.id })}
          className="flex items-center justify-between border-b border-[var(--sw360-charcoal)]/8 px-4 py-3 last:border-b-0"
          style={{ minHeight: 56, borderTopWidth: i === 0 ? 0 : undefined }}
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
    </SW360ExpandableSection>
  );
}
