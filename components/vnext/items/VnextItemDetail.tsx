import Link from "next/link";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextClientItem, VnextItemQuestion } from "@/lib/vnext/items/item-types";
import { VnextItemQuestions } from "./VnextItemQuestions";
import { VnextItemStatus } from "./VnextItemStatus";

type Props = {
  item: VnextClientItem;
  itemsHref: string;
  exploreBase: string;
  questions: VnextItemQuestion[];
  endpoint: string | null;
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[var(--vnext-ink-muted)]">{label}</dt>
      <dd className="m-0 text-[var(--vnext-ink)]">{value}</dd>
    </>
  );
}

/** Location and documented date already lead the page. Side facts are only the extras. */
function sideFacts(item: VnextClientItem): Array<{ label: string; value: string }> {
  return [
    item.trade ? { label: "Trade", value: item.trade } : null,
    item.category ? { label: "Category", value: item.category } : null,
    item.priorityLabel ? { label: "Priority", value: item.priorityLabel } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
}

export function VnextItemDetail({ item, itemsHref, exploreBase, questions, endpoint }: Props) {
  const facts = sideFacts(item);
  const viewHref = item.spatialAction
    ? vnextExploreHref(exploreBase, {
        rep: item.spatialAction.representation,
        source: item.spatialAction.sourceId,
        item: item.id,
      })
    : null;

  return (
    <article
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-item-detail={item.id}
    >
      <Link
        href={itemsHref}
        className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline"
      >
        Items
      </Link>
      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="m-0 min-w-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
          {item.title}
        </h1>
        <VnextItemStatus label={item.statusLabel} tone={item.statusTone} />
      </header>
      {item.locationLabel || item.dateLabel ? (
        <p className="m-0 mt-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
          {[item.locationLabel, item.dateLabel ? `Documented ${item.dateLabel}` : null].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start">
        <div className="min-w-0">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="max-h-[32rem] w-auto max-w-full object-contain" />
          ) : (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{item.typeLabel}</p>
          )}
          {item.description ? (
            <p className="m-0 mt-4 whitespace-pre-wrap text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5 border-t border-[var(--vnext-line)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {facts.length > 0 ? (
            <dl className="m-0 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-y-2 text-[length:var(--vnext-meta)]">
              {facts.map((fact) => (
                <Fact key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </dl>
          ) : null}

          {viewHref ? (
            <div>
              <Link
                href={viewHref}
                className="inline-flex min-h-[var(--vnext-touch)] items-center bg-[var(--vnext-accent)] px-5 text-[length:var(--vnext-body)] font-medium text-white no-underline"
              >
                View in project
              </Link>
              {item.spatialAction && !item.spatialAction.precise ? (
                <p className="m-0 mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                  Opens the panorama. Direction was not recorded.
                </p>
              ) : null}
            </div>
          ) : null}

          {item.relatedItemId && item.relatedTitle ? (
            <Link
              href={`${itemsHref}/${item.relatedItemId}`}
              className="inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-accent)] no-underline"
            >
              Related record: {item.relatedTitle}
            </Link>
          ) : null}

          <VnextItemQuestions initial={questions} endpoint={endpoint} />
        </div>
      </div>
    </article>
  );
}
