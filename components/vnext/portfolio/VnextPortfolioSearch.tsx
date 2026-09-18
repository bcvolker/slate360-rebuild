"use client";

import { VNEXT_PORTFOLIO_SEARCH_LABEL } from "@/lib/vnext/copy";

type Props = {
  value: string;
  onChange: (value: string) => void;
  clearHref: string;
};

export function VnextPortfolioSearch({ value, onChange, clearHref }: Props) {
  return (
    <form role="search" method="get" className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor={`vnext-project-search-${value ? "active" : "idle"}`}>
        {VNEXT_PORTFOLIO_SEARCH_LABEL}
      </label>
      <input
        id={`vnext-project-search-${value ? "active" : "idle"}`}
        name="q"
        className="vnext-search-input min-w-0 flex-1 px-3"
        type="text"
        role="searchbox"
        defaultValue={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={VNEXT_PORTFOLIO_SEARCH_LABEL}
        autoComplete="off"
        spellCheck={false}
        data-vnext-search="true"
        suppressHydrationWarning
      />
      <button type="submit" hidden>
        Search
      </button>
      {value ? (
        <a
          href={clearHref}
          className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center justify-center self-start px-3 text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline"
        >
          Clear
        </a>
      ) : null}
    </form>
  );
}
