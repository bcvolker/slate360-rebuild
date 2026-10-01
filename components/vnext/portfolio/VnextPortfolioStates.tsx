import { VNEXT_PORTFOLIO_EMPTY, VNEXT_PORTFOLIO_ERROR } from "@/lib/vnext/copy";

export function VnextPortfolioEmpty() {
  return (
    <p className="m-0 max-w-[36rem] text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
      {VNEXT_PORTFOLIO_EMPTY}
    </p>
  );
}

export function VnextPortfolioNoResults({
  query,
  clearHref,
}: {
  query: string;
  clearHref: string;
}) {
  return (
    <div className="flex max-w-[36rem] flex-col items-start gap-3">
      <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
        No projects match “{query}”.
      </p>
      <a
        href={clearHref}
        className="inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline"
      >
        Clear search
      </a>
    </div>
  );
}

export function VnextPortfolioError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex max-w-[36rem] flex-col items-start gap-3">
      <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
        {VNEXT_PORTFOLIO_ERROR}
      </p>
      {onRetry ? (
        <button
          type="button"
          className="inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)]"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function VnextPortfolioLoading() {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index}>
          <div className="vnext-hero" />
          <div className="mt-3 h-4 w-3/4 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
          <div className="mt-2 h-3 w-1/2 bg-[color-mix(in_srgb,var(--vnext-ink)_6%,var(--vnext-canvas))]" />
        </li>
      ))}
    </ul>
  );
}
