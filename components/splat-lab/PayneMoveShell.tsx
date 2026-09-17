"use client";

import { useEffect, useState } from "react";
import { PayneItemList } from "@/components/splat-lab/PayneItemList";
import { SplatLabWalkViewer } from "@/components/splat-lab/SplatLabWalkViewer";
import type { PayneItem } from "@/lib/splat-lab/payne-items";

type Tab = "items" | "plan" | "walk";

export function PayneMoveShell({
  splatSrc,
  items,
  planSrc,
}: {
  splatSrc: string | null;
  items: PayneItem[];
  planSrc: string;
}) {
  const [tab, setTab] = useState<Tab>(splatSrc ? "walk" : "items");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!splatSrc && tab === "walk") setTab("items");
  }, [splatSrc, tab]);

  return (
    <div className="relative min-h-[100dvh] bg-[var(--graphite-canvas)] lg:h-[100dvh] lg:overflow-hidden">
      <nav className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {(["items", "plan", "walk"] as Tab[]).map((id) => {
          if (id === "walk" && !splatSrc) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-11 px-3 text-[12px] font-semibold uppercase tracking-wide ${
                tab === id ? "text-[var(--twin360-blue)]" : "text-[var(--mkt-canvas)]/55"
              }`}
            >
              {id === "items" ? "Items" : id === "plan" ? "Plan" : "Walk"}
            </button>
          );
        })}
      </nav>
      <div className="pt-14 lg:h-full">
        {tab === "items" ? (
          <div className="mx-auto h-[calc(100dvh-3.5rem)] max-w-lg">
            <PayneItemList items={items} selectedId={picked} onPick={setPicked} />
          </div>
        ) : null}
        {tab === "plan" ? (
          <div className="mx-auto max-w-3xl px-4 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={planSrc} alt="Brooke target layout for Payne 213" className="w-full" />
            <p className="mt-3 text-[13px] text-[var(--mkt-canvas)]/70">
              Pink blocks are the tables that stay, arranged as Brooke drew. Move items go to Sun Devil Hall.
            </p>
          </div>
        ) : null}
        {tab === "walk" && splatSrc ? (
          <SplatLabWalkViewer
            src={splatSrc}
            kicker="Payne Hall 213"
            title="Furniture move"
            note="Walk the room. Items tab lists what moves. Pins will be confirmed on site."
          />
        ) : null}
      </div>
    </div>
  );
}
