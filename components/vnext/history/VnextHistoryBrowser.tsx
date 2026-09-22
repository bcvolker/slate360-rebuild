"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { HISTORY_EMPTY_COPY } from "@/lib/vnext/history/history-types";
import { orderVisits } from "@/lib/vnext/history/history-rules";
import type { VnextHistoryKind, VnextVisit } from "@/lib/vnext/history/history-types";

type Props = {
  visits: VnextVisit[];
  historyBase: string;
  error?: string | null;
};

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

const FILTERS: Array<{ id: "all" | VnextHistoryKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "site", label: "Site documentation" },
  { id: "reality", label: "Reality" },
  { id: "pano", label: "360" },
  { id: "thermal", label: "Thermal" },
];

export function VnextHistoryBrowser(props: Props) {
  return (
    <Suspense fallback={null}>
      <HistoryInner {...props} />
    </Suspense>
  );
}

function HistoryInner({ visits, historyBase, error = null }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? historyBase;
  const searchParams = useSearchParams();
  const kind = searchParams?.get("kind") ?? "all";
  const pickKey = searchParams?.get("pick") ?? "";
  const urlPick = pickKey.split(",").filter(Boolean).slice(0, 2);
  const [picked, setPicked] = useState(urlPick);
  const pickedRef = useRef(urlPick);
  useEffect(() => {
    const next = pickKey.split(",").filter(Boolean).slice(0, 2);
    pickedRef.current = next;
    setPicked(next);
  }, [pickKey]);
  const chronological = useMemo(
    () => [...visits].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id.localeCompare(a.id)),
    [visits],
  );
  const visible = chronological.filter((visit) => matches(visit, kind));
  const filters = FILTERS.filter((filter) => filterApplies(chronological, filter.id));
  const selected = picked
    .map((id) => chronological.find((visit) => visit.id === id))
    .filter((visit): visit is VnextVisit => Boolean(visit));
  const pair = selected.length === 2 ? orderVisits(selected[0], selected[1]) : null;

  function push(next: { kind?: string; pick?: string[] }) {
    const params = new URLSearchParams(window.location.search);
    const nextKind = next.kind ?? params.get("kind") ?? "all";
    const nextPick = next.pick ?? pickedRef.current;
    if (nextKind && nextKind !== "all") params.set("kind", nextKind);
    else params.delete("kind");
    if (nextPick.length) params.set("pick", nextPick.join(","));
    else params.delete("pick");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  function toggle(id: string) {
    const current = pickedRef.current;
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id].slice(-2);
    pickedRef.current = next;
    setPicked(next);
    push({ pick: next });
  }

  const compareHref = useMemo(() => {
    if (!pair) return null;
    return `${historyBase}/compare?a=${encodeURIComponent(pair.earlier.id)}&b=${encodeURIComponent(pair.later.id)}`;
  }, [historyBase, pair]);

  return (
    <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-history="list">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">History</h1>
      {error ? <VnextOverviewErrorNotice message={error} /> : null}
      {!error && filters.length > 2 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={kind === filter.id}
              onClick={() => push({ kind: filter.id })}
              className={`inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center px-3 text-[length:var(--vnext-body)] ${kind === filter.id ? "text-[var(--vnext-accent)]" : "text-[var(--vnext-ink)]"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}
      {pair && compareHref ? (
        <p className="m-0 mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          Earlier {pair.earlier.dateLabel} · Later {pair.later.dateLabel}{" "}
          <Link href={compareHref} className={ACTION}>
            Compare
          </Link>
        </p>
      ) : null}
      {!error && visible.length === 0 ? (
        <p className="m-0 mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{HISTORY_EMPTY_COPY}</p>
      ) : null}
      {!error && visible.length > 0 ? (
        <ul className="m-0 mt-4 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0">
          {visible.map((visit) => (
            <li key={visit.id} className="border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`${historyBase}/${visit.id}`} className="flex min-h-[var(--vnext-touch)] min-w-0 flex-1 items-center gap-3 text-[var(--vnext-ink)] no-underline">
                  <VisitThumb visit={visit} />
                  <span className="min-w-0">
                    <span className="block text-[length:var(--vnext-body)] font-medium">{visit.dateLabel}</span>
                    <span className="mt-0.5 block truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                      {[visit.kindLabel, visit.title !== visit.kindLabel ? visit.title : null, visit.itemCount ? `${visit.itemCount} items` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
                <span className="flex shrink-0 items-center gap-4">
                  <button type="button" className={ACTION} onClick={() => toggle(visit.id)}>
                    {picked.includes(visit.id) ? "Selected" : "Select for compare"}
                  </button>
                  <Link href={`${historyBase}/${visit.id}`} className={ACTION}>
                    Open visit
                  </Link>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function VisitThumb({ visit }: { visit: VnextVisit }) {
  if (!visit.thumbnailHref) {
    return (
      <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--vnext-ink)_5%,var(--vnext-canvas))] text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        Record
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={visit.thumbnailHref} alt="" className="h-[4.5rem] w-[4.5rem] shrink-0 object-cover" />
  );
}

function filterApplies(visits: VnextVisit[], id: string): boolean {
  if (id === "all") return true;
  if (id === "reality") return visits.some((visit) => visit.sources.some((source) => source.rep === "reality"));
  if (id === "pano") return visits.some((visit) => visit.kind === "pano" || visit.sources.some((source) => source.rep === "360"));
  return visits.some((visit) => visit.kind === id);
}

function matches(visit: VnextVisit, kind: string): boolean {
  if (kind === "all") return true;
  if (kind === "reality") return visit.sources.some((source) => source.rep === "reality");
  if (kind === "pano") return visit.kind === "pano" || visit.sources.some((source) => source.rep === "360");
  return visit.kind === kind;
}
