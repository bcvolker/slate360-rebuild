"use client";

import { useEffect, useState } from "react";
import { WalkthroughCardGrid } from "@/components/spatial-walkthrough/library/WalkthroughCardGrid";
import type { WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { CreateSheet } from "@/components/product-shell/CreateSheet";

export function SpatialWalkthroughIndex({ canAuthor }: { canAuthor: boolean }) {
  const [items, setItems] = useState<WalkthroughCard[]>([]);
  const [create, setCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/spatial-walkthrough", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setItems(json.walkthroughs ?? []))
      .catch(() => undefined);
  }, []);

  const visible = items.filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Spatial Walkthroughs</h1>
        {canAuthor ? (
          <button type="button" onClick={() => setCreate(true)} className="inline-flex h-12 items-center border border-white/20 px-4 text-sm">
            + New Walkthrough
          </button>
        ) : null}
      </header>
      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" className="h-12 border border-white/10 px-4 text-sm" onClick={() => setFiltersOpen((v) => !v)}>
          Filter
        </button>
        {filtersOpen ? (
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-12 min-w-[12rem] border border-white/10 bg-transparent px-3 text-sm" />
        ) : null}
      </div>
      <WalkthroughCardGrid items={visible} hrefFor={(id) => `/spatial-walkthrough/${id}`} />
      <CreateSheet open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
