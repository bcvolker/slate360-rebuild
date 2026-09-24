import Link from "next/link";
import { VnextProjectHero } from "@/components/vnext/portfolio/VnextProjectHero";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { REPRESENTATION_LABEL } from "@/lib/vnext/project-hero";
import type { VnextProjectOverview as VnextProjectOverviewData } from "@/lib/vnext/overview-types";

type Props = {
  overview: VnextProjectOverviewData;
  loadError?: string | null;
};

const SECTION_HEADING =
  "m-0 text-[length:var(--vnext-body)] font-semibold tracking-tight text-[var(--vnext-ink)]";
const VIEW_ALL_LINK =
  "inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";
const LABEL_TEXT = "m-0 text-[length:var(--vnext-meta)] uppercase tracking-wide text-[var(--vnext-ink-muted)]";
const SURFACE = "border border-[var(--vnext-line)] bg-[var(--vnext-surface)]";

function RecentList({
  title,
  viewAllHref,
  viewAllLabel,
  rows,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  rows: Array<{ id: string; primary: string; secondary: string }>;
}) {
  return (
    <section className={`${SURFACE} p-5`} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={SECTION_HEADING}>{title}</h2>
        <Link href={viewAllHref} className={VIEW_ALL_LINK}>
          {viewAllLabel}
        </Link>
      </div>
      <ul className="m-0 mt-3 list-none divide-y divide-[var(--vnext-line)] p-0">
        {rows.map((row) => (
          <li key={row.id} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="min-w-0 truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
              {row.primary}
            </span>
            <span className="shrink-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
              {row.secondary}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VnextProjectOverview({ overview, loadError = null }: Props) {
  const hasRepresentations = overview.representations.length > 0;
  const hasItems = overview.recentItems.length > 0;
  const hasDocuments = overview.recentDocuments.length > 0;
  const hasBothRecent = hasItems && hasDocuments;
  const isSparse = !loadError && !hasRepresentations && !overview.latestVisit && !hasItems && !hasDocuments;

  return (
    <div
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-overview={overview.id}
    >
      {/* A. Project identity / hero — one composed record, not two floating columns. */}
      <div className={`grid grid-cols-1 ${SURFACE} md:grid-cols-[minmax(0,42%)_1fr]`}>
        <VnextProjectHero hero={overview.hero} fill />
        <div className="flex min-w-0 flex-col justify-center gap-1.5 p-6 md:p-8">
          <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
            {overview.name}
          </h1>
          {overview.context ? (
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
              {overview.context}
            </p>
          ) : null}
          {overview.locationLabel ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
              {overview.locationLabel}
            </p>
          ) : null}
          {overview.documentedLabel ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
              {overview.documentedLabel}
            </p>
          ) : null}

          {hasRepresentations ? (
            <Link
              href={overview.exploreHref}
              data-vnext-explore-cta="true"
              aria-label="Explore project"
              className="mt-4 inline-flex min-h-[var(--vnext-touch)] w-fit items-center bg-[var(--vnext-accent)] px-5 text-[length:var(--vnext-body)] font-medium text-white no-underline hover:bg-[var(--vnext-accent-hover)]"
            >
              Explore
            </Link>
          ) : null}
        </div>
      </div>

      {loadError ? <VnextOverviewErrorNotice message={loadError} /> : null}

      {isSparse ? (
        <div className={`${SURFACE} mt-6 p-5`} data-vnext-sparse-notice="true">
          <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
            No site visits or project records yet.
          </p>
        </div>
      ) : (
        <>
          {/* B. Compact state strip — latest visit + available representations, one glance. */}
          {overview.latestVisit || hasRepresentations ? (
            <div
              className={`${SURFACE} mt-6 grid grid-cols-1 divide-y divide-[var(--vnext-line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0`}
            >
              {overview.latestVisit ? (
                <div className="flex flex-col gap-0.5 border-l-2 border-[var(--vnext-accent)] p-4">
                  <p className={LABEL_TEXT}>Latest visit</p>
                  <p className="m-0 truncate text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
                    {overview.latestVisit.sourceLabel} · {overview.latestVisit.dateLabel}
                  </p>
                </div>
              ) : null}
              {hasRepresentations ? (
                <div className="flex flex-col gap-0.5 border-l-2 border-[var(--vnext-accent)] p-4 sm:border-l-0">
                  <p className={LABEL_TEXT}>Available</p>
                  <p className="m-0 truncate text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
                    {overview.representations.map((id) => REPRESENTATION_LABEL[id]).join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* C. Recent content — balanced two-up on desktop, single full-width when only one exists. */}
          {hasItems || hasDocuments ? (
            <div className={`mt-6 grid grid-cols-1 gap-6 ${hasBothRecent ? "lg:grid-cols-2" : ""}`}>
              {hasItems ? (
                <RecentList
                  title="Recent items"
                  viewAllHref={overview.itemsHref}
                  viewAllLabel="View all items"
                  rows={overview.recentItems.map((item) => ({
                    id: item.id,
                    primary: item.title,
                    secondary: `${item.statusLabel} · ${item.dateLabel}`,
                  }))}
                />
              ) : null}
              {hasDocuments ? (
                <RecentList
                  title="Recent documents"
                  viewAllHref={overview.documentsHref}
                  viewAllLabel="View all documents"
                  rows={overview.recentDocuments.map((document) => ({
                    id: document.id,
                    primary: document.name,
                    secondary: document.dateLabel,
                  }))}
                />
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
