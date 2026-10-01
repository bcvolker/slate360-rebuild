import Link from "next/link";
import type { VnextVisit } from "@/lib/vnext/history/history-types";

type Props = {
  visit: VnextVisit;
  historyHref: string;
};

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

export function VnextHistoryVisit({ visit, historyHref }: Props) {
  return (
    <article className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-history-visit={visit.id}>
      <Link href={historyHref} className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline">
        History
      </Link>
      <p className="m-0 mt-3 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{visit.kindLabel}</p>
      <h1 className="m-0 mt-1 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">{visit.dateLabel}</h1>
      <p className="m-0 mt-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{visit.title}</p>
      {visit.thumbnailHref ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visit.thumbnailHref} alt="" className="mt-5 max-h-[28rem] w-auto max-w-full object-contain" />
      ) : null}
      {visit.sources.some((source) => source.rep !== "plan") ? (
        <ul className="m-0 mt-5 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0">
          {visit.sources.filter((source) => source.rep !== "plan").map((source) => (
            <li key={`${source.rep}-${source.sourceId}`} className="flex items-center justify-between gap-3 border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
              <span className="text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{source.label}</span>
              <Link href={source.exploreHref} className={ACTION}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {visit.plans.length > 0 ? (
        <div className="mt-6">
          <h2 className="m-0 text-[length:var(--vnext-body)] font-medium text-[var(--vnext-ink)]">Plan</h2>
          <ul className="m-0 mt-2 list-none p-0">
            {visit.plans.map((plan) => (
              <li key={plan.sheetId}>
                <Link href={plan.exploreHref} className={ACTION}>
                  {plan.sheetLabel}
                  {plan.revisionLabel ? ` · ${plan.revisionLabel}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {visit.items.length > 0 ? (
        <div className="mt-6">
          <h2 className="m-0 text-[length:var(--vnext-body)] font-medium text-[var(--vnext-ink)]">
            {visit.itemCount} {visit.itemCount === 1 ? "item" : "items"}
          </h2>
          <ul className="m-0 mt-2 list-none p-0">
            {visit.items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={ACTION}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
