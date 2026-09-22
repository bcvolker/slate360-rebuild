import Link from "next/link";
import type { VnextExploreItemFocus } from "@/lib/vnext/items/item-types";

export function VnextExploreItemContext({ focus }: { focus: VnextExploreItemFocus }) {
  const bits = [focus.statusLabel, focus.locationLabel, focus.contextNote].filter(Boolean);
  return (
    <div
      className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 py-2"
      data-vnext-item-context={focus.itemId}
    >
      <p className="m-0 min-w-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
        <span className="font-medium">{focus.title}</span>
        {bits.length > 0 ? <span className="text-[var(--vnext-ink-muted)]"> · {bits.join(" · ")}</span> : null}
      </p>
      <Link
        href={focus.detailHref}
        className="inline-flex min-h-[var(--vnext-touch)] shrink-0 items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline"
      >
        View item
      </Link>
    </div>
  );
}
