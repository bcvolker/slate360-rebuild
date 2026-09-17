"use client";

import { useEffect, useMemo, useState } from "react";
import { PayneItemList } from "@/components/splat-lab/PayneItemList";
import { PaynePlanBoard } from "@/components/splat-lab/PaynePlanBoard";
import { PayneStillsStrip, type PayneStill } from "@/components/splat-lab/PayneStillsStrip";
import { PayneTabBar, type PayneTab } from "@/components/splat-lab/PayneTabBar";
import { PayneLidarCloud } from "@/components/splat-lab/PayneLidarCloud";
import { PayneSplatStage } from "@/components/splat-lab/PayneSplatStage";
import type { PayneItem } from "@/lib/splat-lab/payne-items";

export function PayneMoveShell({
  splatSrc,
  geometrySrc,
  items,
  planSrc,
  stills,
  stillsCaptured,
}: {
  splatSrc: string | null;
  geometrySrc: string | null;
  items: PayneItem[];
  planSrc: string;
  stills: PayneStill[];
  stillsCaptured?: number;
}) {
  const tabs = useMemo(() => {
    const next: PayneTab[] = ["items", "plan"];
    if (stills.length) next.push("photos");
    if (splatSrc) next.push("walk");
    if (geometrySrc) next.push("geometry");
    return next;
  }, [geometrySrc, splatSrc, stills.length]);
  const [tab, setTab] = useState<PayneTab>("items");
  const [picked, setPicked] = useState<string | null>(null);
  const [showStay, setShowStay] = useState(false);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0] ?? "items");
  }, [tab, tabs]);

  return (
    <div className="relative min-h-[100dvh] bg-[var(--graphite-canvas)] lg:h-[100dvh] lg:overflow-hidden">
      <PayneTabBar tabs={tabs} active={tab} onPick={setTab} />
      <div className="pt-14 lg:h-full">
        {tab === "items" ? (
          <div className="mx-auto h-[calc(100dvh-3.5rem)] max-w-lg">
            <PayneItemList items={items} selectedId={picked} onPick={setPicked} />
          </div>
        ) : null}
        {tab === "plan" ? (
          <PaynePlanBoard
            planSrc={planSrc}
            items={items}
            showStay={showStay}
            selectedId={picked}
            onPick={setPicked}
          />
        ) : null}
        {tab === "photos" ? (
          <div className="h-[calc(100dvh-3.5rem)]">
            <PayneStillsStrip stills={stills} captured={stillsCaptured} />
          </div>
        ) : null}
        {tab === "walk" && splatSrc ? (
          <PayneSplatStage src={splatSrc} kicker="Payne Hall 213 · 360" title="Furniture move" />
        ) : null}
        {tab === "geometry" && geometrySrc ? (
          geometrySrc.endsWith(".ply") ? (
            <PayneLidarCloud src={geometrySrc} />
          ) : (
            <PayneSplatStage src={geometrySrc} kicker="Payne Hall 213 · LiDAR" title="Metric room" />
          )
        ) : null}
      </div>
      {tab === "plan" ? (
        <button
          type="button"
          onClick={() => setShowStay((v) => !v)}
          className="absolute right-3 top-14 z-30 min-h-11 text-[12px] font-semibold text-[var(--twin360-blue)]"
        >
          {showStay ? "Hide stay" : "Show stay"}
        </button>
      ) : null}
    </div>
  );
}
