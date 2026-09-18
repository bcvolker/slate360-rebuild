import Link from "next/link";

export function VnextExploreEmptyState({ overviewHref }: { overviewHref: string }) {
  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-3 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-8 text-center"
      data-vnext-explore-empty="true"
    >
      <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
        Nothing is documented for this project yet.
      </p>
      <Link
        href={overviewHref}
        className="mt-2 inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline"
      >
        Back to overview
      </Link>
    </div>
  );
}
