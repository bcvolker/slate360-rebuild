"use client";

import type { ReactElement } from "react";

export type TwinDebugStats = {
  displayMb: number;
  displayTris: number;
  displayLoadMs: number | null;
  displayFps: number;
  navMb: number;
  navTris: number;
  navLoadMs: number | null;
  measureMb: number;
  measureTris: number;
  dpr: number;
  drawCalls: number | null;
};

export function KitchenProofDebug({ stats }: { stats: TwinDebugStats }): ReactElement {
  return (
    <aside className="pointer-events-none absolute right-3 top-3 z-40 max-w-xs rounded-xl border border-white/10 bg-black/55 p-3 font-mono text-[10px] leading-5 text-white/80">
      <p>geometry-display {stats.displayMb.toFixed(1)} MB · {stats.displayTris.toLocaleString()} tri · {stats.displayLoadMs ?? "—"} ms · {stats.displayFps.toFixed(1)} fps</p>
      <p>geometry-nav {stats.navMb.toFixed(1)} MB · {stats.navTris.toLocaleString()} tri · {stats.navLoadMs ?? "—"} ms</p>
      <p>geometry-measurement {stats.measureMb.toFixed(1)} MB · {stats.measureTris.toLocaleString()} tri</p>
      <p>appearance unavailable</p>
      <p>DPR {stats.dpr.toFixed(2)} · draw calls {stats.drawCalls ?? "—"}</p>
    </aside>
  );
}
