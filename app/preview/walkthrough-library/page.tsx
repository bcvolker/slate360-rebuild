"use client";

import { WalkthroughCardGrid } from "@/components/spatial-walkthrough/library/WalkthroughCardGrid";
import type { WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";

const HERO =
  "/api/spatial-walkthrough/public/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/media?clip=f278d37f-1c2f-4511-aef5-437b3992d39d&kind=hero";

const ITEMS: WalkthroughCard[] = [
  {
    id: "7e0575a3-5d55-45d8-807f-9fb959ce2c21",
    title: "HouseWalk",
    captured_at: "2026-08-29T00:00:00.000Z",
    building: "AOB205 — ASU",
    floor: null,
    zone: "Kitchen",
    walkthrough_type: "interior",
    status: "ready",
    duration_s: 51,
    waypointCount: 4,
    pinCount: 3,
    shareStatus: "client",
    posterUrl: HERO,
  },
];

export default function WalkthroughLibraryPreview() {
  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)] px-4 py-8 lg:px-8" data-testid="library-preview">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Spatial Walkthroughs</h1>
        <span className="inline-flex h-12 items-center border border-white/20 px-4 text-sm text-white">+ New Walkthrough</span>
      </header>
      <WalkthroughCardGrid items={ITEMS} hrefFor={(id) => `/spatial-walkthrough/${id}`} />
    </main>
  );
}
