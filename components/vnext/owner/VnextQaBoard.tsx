import Link from "next/link";
import type { QaItem } from "@/lib/vnext/ops/qa-model";
import { representationLabel } from "@/lib/vnext/ops/qa-model";

export function VnextQaBoard({ items, error }: { items: QaItem[]; error: string | null }) {
  const review = items.filter((item) => item.bucket === "needs_review");
  const ready = items.filter((item) => item.bucket === "ready_to_publish");
  const published = items.filter((item) => item.bucket === "published");
  const rejected = items.filter((item) => item.bucket === "rejected");
  const waiting = review.length + ready.length;
  return (
    <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-qa="true">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">QA</h1>
      {error ? <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-qa-error="true">{error}</p> : null}
      {!error && waiting === 0 && published.length === 0 && rejected.length === 0 ? (
        <p className="mt-6 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-qa-empty="true">Nothing is waiting for review.</p>
      ) : null}
      <Section title="Needs review" items={review} action="Review" />
      <Section title="Ready to publish" items={ready} action="Preview / Publish" />
      <Section title="Published" items={published} action="Open" />
      <Section title="Rejected" items={rejected} action="Open" />
    </div>
  );
}

function Section({ title, items, action }: { title: string; items: QaItem[]; action: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="m-0 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">{title}</h2>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li key={`${item.representation}-${item.sourceId}`} className="flex items-center justify-between gap-3 border-b border-[var(--vnext-line)] py-3" data-vnext-qa-row={`${item.representation}-${item.sourceId}`}>
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
              {item.projectName} · {representationLabel(item.representation)} · {item.version ?? item.occurredAt ?? item.title}
            </p>
            <Link href={`/vnext/ops/qa/${item.projectId}/${item.representation}/${item.sourceId}`} className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center px-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
              {action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
