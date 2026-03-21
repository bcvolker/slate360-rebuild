"use client";

interface MarketConsoleHeaderStripProps {
  activeTabLabel: string;
  runtimeStatus: string;
  configSourceLabel: string;
  blockerCount: number;
  liveReady: boolean;
  openPositionsCount: number;
  lastRunLabel: string;
}

function toneClass(liveReady: boolean, blockerCount: number): string {
  if (liveReady && blockerCount === 0) {
    return "border-emerald-500/30 bg-emerald-950 text-emerald-300";
  }
  if (blockerCount > 0) {
    return "border-amber-500/30 bg-amber-950 text-amber-300";
  }
  return "border-zinc-800 bg-zinc-900 text-slate-400";
}

export default function MarketConsoleHeaderStrip({
  activeTabLabel,
  runtimeStatus,
  configSourceLabel,
  blockerCount,
  liveReady,
  openPositionsCount,
  lastRunLabel,
}: MarketConsoleHeaderStripProps) {
  return (
    <div className="mb-8 flex items-center justify-between rounded-3xl border border-zinc-800 bg-zinc-950 px-8 py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-2xl">🤖</div>
        <div>
          <div className="text-xs font-mono tracking-[2px] text-slate-500">MARKET ROBOT</div>
          <div className="text-2xl font-semibold text-white -mt-1">{activeTabLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-8 text-sm">
          <div>
            <span className="text-slate-500 text-xs">STATUS</span><br />
            <span className="font-mono text-emerald-400">{runtimeStatus.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">POSITIONS</span><br />
            <span className="font-semibold text-white">{openPositionsCount}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">LAST RUN</span><br />
            <span className="font-mono text-slate-400">{lastRunLabel}</span>
          </div>
        </div>

        <div className={`rounded-2xl border px-5 py-2.5 text-sm font-medium ${toneClass(liveReady, blockerCount)}`}>
          LIVE READY: {liveReady ? "✅ YES" : `${blockerCount} BLOCKERS`}
        </div>
      </div>
    </div>
  );
}