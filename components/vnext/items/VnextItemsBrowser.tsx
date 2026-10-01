"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import {
  ITEMS_EMPTY_COPY,
  ITEMS_FILTER_EMPTY_COPY,
  itemMatchesQuery,
  statusMatchesFilter,
  type ItemStatusFilter,
} from "@/lib/vnext/items/item-language";
import type { VnextClientItem } from "@/lib/vnext/items/item-types";
import { VnextItemStatus } from "./VnextItemStatus";

type Props = {
  items: VnextClientItem[];
  itemsBase: string;
  exploreBase: string;
};

const FIELD =
  "min-h-[var(--vnext-touch)] border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

function contextLine(item: VnextClientItem): string {
  return [item.locationLabel, item.dateLabel].filter(Boolean).join(" · ");
}

function ItemThumb({ item }: { item: VnextClientItem }) {
  const [failed, setFailed] = useState(false);
  if (!item.thumbnailUrl || failed) {
    return (
      <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--vnext-ink)_5%,var(--vnext-canvas))] text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        {item.typeLabel}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.thumbnailUrl}
      alt=""
      className="h-[4.5rem] w-[4.5rem] shrink-0 object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function VnextItemsBrowser({ items, itemsBase, exploreBase }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ItemStatusFilter>("all");
  const [trade, setTrade] = useState("all");

  const trades = useMemo(() => {
    const values = new Set(items.map((item) => item.trade).filter((value): value is string => Boolean(value)));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visible = items.filter((item) => {
    if (!statusMatchesFilter(item.status, status)) return false;
    if (trade !== "all" && item.trade !== trade) return false;
    return itemMatchesQuery(item, query);
  });

  if (items.length === 0) {
    return (
      <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-items="empty">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Items</h1>
        <p className="m-0 mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 py-5 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
          {ITEMS_EMPTY_COPY}
        </p>
      </div>
    );
  }

  return (
    <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-items="list">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Items</h1>
        <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search items"
          placeholder="Search items"
          className={`${FIELD} w-full min-w-0 sm:flex-1`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ItemStatusFilter)}
          className={FIELD}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        {trades.length > 1 ? (
          <select aria-label="Filter by trade" value={trade} onChange={(event) => setTrade(event.target.value)} className={FIELD}>
            <option value="all">All trades</option>
            {trades.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="m-0 mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 py-5 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
          {ITEMS_FILTER_EMPTY_COPY}
        </p>
      ) : (
        <ul className="m-0 mt-4 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0">
          {visible.map((item) => {
            const viewHref = item.spatialAction
              ? vnextExploreHref(exploreBase, {
                  rep: item.spatialAction.representation,
                  source: item.spatialAction.sourceId,
                  item: item.id,
                })
              : null;
            return (
              <li key={item.id} className="border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`${itemsBase}/${item.id}`}
                    className="flex min-h-[var(--vnext-touch)] min-w-0 flex-1 items-center gap-3 text-[var(--vnext-ink)] no-underline"
                  >
                    <ItemThumb item={item} />
                    <span className="min-w-0">
                      <span className="block truncate text-[length:var(--vnext-body)] font-medium">{item.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {contextLine(item) ? (
                          <span className="truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                            {contextLine(item)}
                          </span>
                        ) : null}
                        <VnextItemStatus label={item.statusLabel} tone={item.statusTone} />
                      </span>
                    </span>
                  </Link>
                  {viewHref ? (
                    <Link
                      href={viewHref}
                      className="inline-flex min-h-[var(--vnext-touch)] shrink-0 items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline"
                    >
                      View in project
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
