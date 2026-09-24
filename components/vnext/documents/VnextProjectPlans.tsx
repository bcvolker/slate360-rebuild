import Link from "next/link";
import type { VnextProjectPlanSet } from "@/lib/vnext/plans/plan-types";
import { VnextPlanUpload } from "./VnextPlanUpload";

type Props = {
  planSets: VnextProjectPlanSet[];
  canUpload: boolean;
  projectId: string | null;
};

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

export function VnextProjectPlans({ planSets, canUpload, projectId }: Props) {
  if (planSets.length === 0 && !canUpload) return null;
  return (
    <section className="mt-8" id="plans" data-vnext-project-plans="true">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="m-0 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">Project plans</h2>
        {canUpload && projectId ? <VnextPlanUpload projectId={projectId} /> : null}
      </div>
      {planSets.length === 0 ? (
        <p className="m-0 mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
          No project plans yet.
        </p>
      ) : (
        planSets.map((set) => (
          <div key={set.id} id={`plan-${set.id}`} className="mt-4">
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-[length:var(--vnext-body)] font-medium text-[var(--vnext-ink)]">{set.title}</h3>
              {set.revisionLabel ? (
                <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{set.revisionLabel}</p>
              ) : null}
              {set.source ? (
                <Link href={set.source.href} className={ACTION}>
                  From: {set.source.title}
                </Link>
              ) : null}
            </div>
            {set.sheets.length > 0 ? (
              <ul className="m-0 mt-2 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0">
                {set.sheets.map((sheet) => (
                  <li
                    key={sheet.id}
                    className="flex flex-col gap-1 border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 truncate text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{sheet.label}</span>
                    {sheet.exploreHref ? (
                      <Link href={sheet.exploreHref} className={ACTION}>
                        Open in Explore
                      </Link>
                    ) : (
                      <span className="text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{sheet.statusLabel}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))
      )}
    </section>
  );
}
