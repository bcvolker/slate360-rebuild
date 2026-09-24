"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { VnextPortfolioGrid } from "@/components/vnext/portfolio/VnextPortfolioGrid";
import { VnextPortfolioSearch } from "@/components/vnext/portfolio/VnextPortfolioSearch";
import {
  VnextPortfolioEmpty,
  VnextPortfolioError,
  VnextPortfolioLoading,
  VnextPortfolioNoResults,
} from "@/components/vnext/portfolio/VnextPortfolioStates";
import { filterPortfolioRecords } from "@/lib/vnext/filter-portfolio";
import type { PortfolioRecord } from "@/lib/vnext/portfolio-types";

export type VnextPortfolioFixture = "ready" | "empty" | "error" | "loading";

type Props = {
  records: PortfolioRecord[];
  loadError?: string | null;
  fixture?: VnextPortfolioFixture;
  initialQuery?: string;
};

export function VnextPortfolioClient(props: Props) {
  return (
    <Suspense fallback={<VnextPortfolioLoadingShell />}>
      <VnextPortfolioClientInner {...props} />
    </Suspense>
  );
}

function VnextPortfolioLoadingShell() {
  return (
    <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
        Projects
      </h1>
      <div className="mt-8">
        <VnextPortfolioLoading />
      </div>
    </div>
  );
}

function VnextPortfolioClientInner({
  records,
  loadError = null,
  fixture = "ready",
  initialQuery = "",
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/vnext/projects";
  const urlQuery = searchParams?.get("q") ?? initialQuery;
  const [query, setQuery] = useState(urlQuery);
  const [retryNonce, setRetryNonce] = useState(0);
  const visible = useMemo(() => filterPortfolioRecords(records, query), [records, query]);
  const showError = fixture === "error" || Boolean(loadError);
  const showLoading = fixture === "loading";
  const showEmpty = fixture === "empty" || (!showError && !showLoading && records.length === 0);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  return (
    <div
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-query={query}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
          Projects
        </h1>
        {!showLoading && !showError && !showEmpty ? (
          <div className="w-full max-w-md lg:w-[22rem]">
            <VnextPortfolioSearch key={urlQuery} value={query} onChange={setQuery} clearHref={pathname} />
          </div>
        ) : null}
      </div>

      <div className="mt-8" data-vnext-portfolio-retry={retryNonce}>
        {showLoading ? <VnextPortfolioLoading /> : null}
        {showError ? (
          <VnextPortfolioError
            onRetry={() => {
              if (loadError && fixture !== "error") {
                window.location.reload();
                return;
              }
              setRetryNonce((value) => value + 1);
            }}
          />
        ) : null}
        {showEmpty ? <VnextPortfolioEmpty /> : null}
        {!showLoading && !showError && !showEmpty && visible.length === 0 ? (
          <VnextPortfolioNoResults query={query} clearHref={pathname} />
        ) : null}
        {!showLoading && !showError && !showEmpty && visible.length > 0 ? (
          <VnextPortfolioGrid projects={visible} />
        ) : null}
      </div>
    </div>
  );
}
