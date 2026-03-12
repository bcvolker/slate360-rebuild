"use client";

import type { MarketSystemStatusViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";

export interface ResultsWalletSnapshot {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  usdcBalance: string | null;
  maticFormatted: string;
  walletVerified: boolean;
  liveChecklist: {
    walletConnected: boolean;
    polygonSelected: boolean;
    usdcFunded: boolean;
    signatureVerified: boolean;
    usdcApproved: boolean;
  };
}

interface MarketResultsVerificationConsoleProps {
  openPositionsCount: number;
  recentTradeCount: number;
  recentActivityCount: number;
  system: MarketSystemStatusViewModel | null;
  systemLoading: boolean;
  systemError: string | null;
  serverStatus: ServerBotStatus;
  walletSnapshot: ResultsWalletSnapshot;
  postActionContext: string | null;
}

function statusLabel(status: ServerBotStatus): string {
  if (status === "unknown") return "Unavailable";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MarketResultsVerificationConsole({
  openPositionsCount,
  recentTradeCount,
  recentActivityCount,
  system,
  systemLoading,
  systemError,
  serverStatus,
  walletSnapshot,
  postActionContext,
}: MarketResultsVerificationConsoleProps) {
  const walletChecksPassed = [
    walletSnapshot.liveChecklist.walletConnected,
    walletSnapshot.liveChecklist.polygonSelected,
    walletSnapshot.liveChecklist.signatureVerified,
    walletSnapshot.liveChecklist.usdcApproved,
    walletSnapshot.liveChecklist.usdcFunded,
  ].filter(Boolean).length;
  const blockerCount = system?.blockers.length ?? 0;

  return (
    <>
      {postActionContext && (
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Post-action context</p>
          <p className="mt-1 leading-6">{postActionContext}</p>
        </div>
      )}

      <div className="rounded-[28px] border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Verification Console</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Open Positions" value={String(openPositionsCount)} />
          <MetricCard label="Recent Trades" value={String(recentTradeCount)} />
          <MetricCard label="Recent Activity" value={String(recentActivityCount)} />
          <MetricCard label="Wallet Checks" value={`${walletChecksPassed}/5`} />
          <MetricCard label="Live Blockers" value={systemLoading ? "..." : String(blockerCount)} />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-xs text-slate-300">
            <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet Snapshot</p>
            <p className="mt-2">Connection: {walletSnapshot.isConnected ? "Connected" : "Disconnected"}</p>
            <p className="mt-1">Address: {walletSnapshot.address ? `${walletSnapshot.address.slice(0, 6)}...${walletSnapshot.address.slice(-4)}` : "Unavailable"}</p>
            <p className="mt-1">USDC: ${walletSnapshot.usdcBalance ?? "0.00"} · Gas: {walletSnapshot.maticFormatted}</p>
            <p className="mt-1">Signature: {walletSnapshot.walletVerified ? "Verified" : "Not verified"}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-xs text-slate-300">
            <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Server Readiness</p>
            <p className="mt-2">Runtime status: {statusLabel(serverStatus)}</p>
            <p className="mt-1">Config source: {system?.configSourceLabel ?? "Unavailable"}</p>
            <p className="mt-1">Live server: {system?.liveServerReady ? "Ready" : "Blocked or unavailable"}</p>
            {systemError && <p className="mt-1 text-amber-300">Status note: {systemError}</p>}
          </div>
        </div>
        {blockerCount > 0 && (
          <div className="mt-3 max-h-28 overflow-y-auto rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {system?.blockers.slice(0, 4).map((blocker) => (
              <p key={blocker.code} className="leading-5">- {blocker.label}: {blocker.detail}</p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}
