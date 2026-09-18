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

export function VnextProjectOverview({ overview, loadError = null }: Props) {
  const hasRepresentations = overview.representations.length > 0;
  const hasItems = overview.recentItems.length > 0;
  const hasDocuments = overview.recentDocuments.length > 0;

  return (
    <div
      className="mx-auto w-full max-w-[64rem] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-overview={overview.id}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
        <div className="max-w-[28rem]">
          <VnextProjectHero hero={overview.hero} />
        </div>

        <div className="min-w-0">
          <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
            {overview.name}
          </h1>
          {overview.context ? (
            <p className="mt-1 mb-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
              {overview.context}
            </p>
          ) : null}
          {overview.locationLabel ? (
            <p className="mt-0.5 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
              {overview.locationLabel}
            </p>
          ) : null}
          {overview.documentedLabel ? (
            <p className="mt-1 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
              {overview.documentedLabel}
            </p>
          ) : null}

          <Link
            href={overview.exploreHref}
            data-vnext-explore-cta="true"
            aria-label="Explore project"
            className="mt-5 inline-flex min-h-[var(--vnext-touch)] items-center bg-[var(--vnext-accent)] px-5 text-[length:var(--vnext-body)] font-medium text-white no-underline hover:bg-[var(--vnext-accent-hover)]"
          >
            Explore
          </Link>

          {loadError ? <VnextOverviewErrorNotice message={loadError} /> : null}

          {overview.latestVisit ? (
            <section className="mt-8" aria-label="Latest visit">
              <h2 className={SECTION_HEADING}>Latest visit</h2>
              <p className="mt-1 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
                {overview.latestVisit.sourceLabel} — {overview.latestVisit.dateLabel}
              </p>
            </section>
          ) : null}

          {hasRepresentations ? (
            <section className="mt-8" aria-label="Available to open">
              <h2 className={SECTION_HEADING}>What you can open</h2>
              <p className="mt-1 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
                {overview.representations.map((id) => REPRESENTATION_LABEL[id]).join(" · ")}
              </p>
            </section>
          ) : null}

          {hasItems ? (
            <section className="mt-8" aria-label="Recent items">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={SECTION_HEADING}>Recent items</h2>
                <Link href={overview.itemsHref} className={VIEW_ALL_LINK}>
                  View all items
                </Link>
              </div>
              <ul className="m-0 mt-2 list-none divide-y divide-[var(--vnext-line)] p-0">
                {overview.recentItems.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                      {item.statusLabel} · {item.dateLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasDocuments ? (
            <section className="mt-8" aria-label="Recent documents">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={SECTION_HEADING}>Recent documents</h2>
                <Link href={overview.documentsHref} className={VIEW_ALL_LINK}>
                  View all documents
                </Link>
              </div>
              <ul className="m-0 mt-2 list-none divide-y divide-[var(--vnext-line)] p-0">
                {overview.recentDocuments.map((document) => (
                  <li key={document.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
                      {document.name}
                    </span>
                    <span className="shrink-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                      {document.dateLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
