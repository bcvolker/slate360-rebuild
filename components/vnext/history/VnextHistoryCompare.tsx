import Link from "next/link";
import { cameraSyncIsReliable, compareUnavailableCopy, orderVisits } from "@/lib/vnext/history/history-rules";
import type { VnextCompareRep, VnextVisit } from "@/lib/vnext/history/history-types";

type Props = {
  earlier: VnextVisit;
  later: VnextVisit;
  historyHref: string;
  rep: VnextCompareRep | null;
};

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

export function VnextHistoryCompare({ earlier, later, historyHref, rep }: Props) {
  const ordered = orderVisits(earlier, later);
  const left = sourceFor(ordered.earlier, rep);
  const right = sourceFor(ordered.later, rep);
  const synced = rep === "reality" && cameraSyncIsReliable(ordered.earlier.frame, ordered.later.frame);
  return (
    <article className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-history-compare="true">
      <Link href={historyHref} className={`${ACTION} text-[var(--vnext-ink-muted)]`}>
        History
      </Link>
      <h1 className="m-0 mt-3 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Compare</h1>
      <p className="m-0 mt-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
        Earlier {ordered.earlier.dateLabel} · Later {ordered.later.dateLabel}
      </p>
      {!rep || !left || !right ? (
          <p className="m-0 mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
            {rep ? compareUnavailableCopy(rep) : "These visits do not share a comparable view."}
          </p>
      ) : (
        <>
          <p className="m-0 mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
            {rep === "360"
              ? "Each panorama stands on its own. This is not the same viewpoint unless the record says so."
              : synced
                ? "These two scans were captured in the same space and line up with each other. Open each one to move through it — this page doesn't move them together."
                : "These two scans aren't linked. Each one stands on its own."}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ComparePane label="Earlier" dateLabel={ordered.earlier.dateLabel} title={left.label} imageHref={left.imageHref} exploreHref={left.exploreHref} />
            <ComparePane label="Later" dateLabel={ordered.later.dateLabel} title={right.label} imageHref={right.imageHref} exploreHref={right.exploreHref} />
          </div>
        </>
      )}
    </article>
  );
}

function sourceFor(visit: VnextVisit, rep: VnextCompareRep | null) {
  if (!rep) return null;
  if (rep === "plan") {
    const plan = visit.plans[0];
    return plan ? { label: plan.sheetLabel, imageHref: plan.imageHref, exploreHref: plan.exploreHref } : null;
  }
  return visit.sources.find((source) => source.rep === rep) ?? null;
}

function ComparePane({
  label,
  dateLabel,
  title,
  imageHref,
  exploreHref,
}: {
  label: string;
  dateLabel: string;
  title: string;
  imageHref: string | null;
  exploreHref: string;
}) {
  return (
    <section className="min-w-0">
      <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{label}</p>
      <h2 className="m-0 mt-1 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">{dateLabel}</h2>
      <p className="m-0 mt-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{title}</p>
      {imageHref ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageHref} alt="" className="mt-3 max-h-[32rem] w-full max-w-full object-contain" />
      ) : (
        <p className="m-0 mt-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">No still image for this visit.</p>
      )}
      <Link href={exploreHref} className={ACTION}>
        Open
      </Link>
    </section>
  );
}
