"use client";

import nextDynamic from "next/dynamic";
import { useMemo, type ReactElement } from "react";

const IsolatedSplatCanvas = nextDynamic(
  () =>
    import("@/components/digital-twin/kitchen-proof/IsolatedSplatCanvas").then((m) => m.IsolatedSplatCanvas),
  { ssr: false },
);

function num(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function ForensicsClient({
  spzUrl,
  search,
}: {
  spzUrl: string;
  search: Record<string, string | string[] | undefined>;
}): ReactElement {
  const get = (k: string) => {
    const v = search[k];
    return Array.isArray(v) ? v[0] : v ?? null;
  };
  const src = get("src") ?? spzUrl;
  const opts = useMemo(
    () => ({
      url: src,
      dpr: num(get("dpr"), 1),
      maxSh: num(get("maxSh"), 3),
      blurAmount: num(get("blur"), 0.3),
      splatScale: num(get("scale"), 1),
      toneMapping: (get("tonemap") === "aces" ? "aces" : "none") as "none" | "aces",
      applySim3: get("sim3") === "1",
      maxSplats: num(get("maxSplats"), 800_000),
    }),
    [src, search],
  );
  return (
    <main className="relative h-dvh w-full bg-[var(--graphite-canvas)]">
      <IsolatedSplatCanvas {...opts} />
      <p className="pointer-events-none absolute left-3 top-3 z-20 font-mono text-[10px] uppercase tracking-wide text-white/50">
        forensics isolated splat
      </p>
    </main>
  );
}
