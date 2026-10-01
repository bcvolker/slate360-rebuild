"use client";

import Link from "next/link";
import type { WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { shareStatusLabel } from "@/lib/spatial-walkthrough/share-status";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function duration(seconds: number | null): string {
  if (seconds == null) return "";
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

export function WalkthroughCardGrid({
  items,
  hrefFor,
}: {
  items: WalkthroughCard[];
  hrefFor: (id: string) => string;
}) {
  const groups = new Map<string, WalkthroughCard[]>();
  for (const item of items) {
    const key = item.building || "Ungrouped";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  if (!items.length) {
    return <p className="py-16 text-sm text-[var(--graphite-text-body)]">No walkthroughs yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {[...groups.entries()].map(([group, rows]) => (
        <section key={group}>
          <p className="mb-3 text-sm text-[var(--graphite-muted)]">{group}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((item) => (
              <article key={item.id} className="overflow-hidden border border-white/10">
                <Link href={hrefFor(item.id)} className="block">
                  <div className="aspect-video bg-white/[0.03]">
                    {item.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="px-3 py-3">
                    <p className="truncate text-sm text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                      {[when(item.captured_at), duration(item.duration_s), `${item.pinCount} pins`].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                      {shareStatusLabel(item.shareStatus)} · {item.status}
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2 border-t border-white/10 px-3 py-2">
                  <Link href={hrefFor(item.id)} className="inline-flex min-h-12 items-center text-sm text-white">
                    Continue editing
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
