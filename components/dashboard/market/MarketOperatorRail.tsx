"use client";

import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";
import type { MarketSystemStatusViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";
import type { ResultsWalletSnapshot } from "@/components/dashboard/market/MarketResultsVerificationConsole";

interface MarketOperatorRailProps {
  walletSnapshot: ResultsWalletSnapshot;
  system: MarketSystemStatusViewModel | null;
  serverStatus: ServerBotStatus;
  activityLogs: MarketActivityLogEntry[];
  onNavigate: (tabId: string) => void;
}

function runtimeLabel(status: ServerBotStatus): string {
  if (status === "unknown") return "Unavailable";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MarketOperatorRail({ walletSnapshot, system, serverStatus, activityLogs, onNavigate }: MarketOperatorRailProps) {
  const recentLogs = activityLogs.slice(0, 4);
  const blockerCount = system?.blockers.length ?? 0;
  const walletChecksPassed = [
    walletSnapshot.liveChecklist.walletConnected,
    walletSnapshot.liveChecklist.polygonSelected,
    walletSnapshot.liveChecklist.signatureVerified,
    walletSnapshot.liveChecklist.usdcApproved,
    walletSnapshot.liveChecklist.usdcFunded,
  ].filter(Boolean).length;

  return (
    <aside className="space-y-4">
      <RailPanel title="Wallet Snapshot" eyebrow="Readiness">
        <p className="text-sm font-semibold text-slate-100">{walletSnapshot.isConnected ? "Connected" : "Disconnected"}</p>
        <p className="mt-2 text-xs text-slate-400">Address</p>
        <p className="mt-1 text-xs text-slate-200">{walletSnapshot.address ? `${walletSnapshot.address.slice(0, 6)}...${walletSnapshot.address.slice(-4)}` : "Unavailable"}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <MiniStat label="USDC" value={`$${walletSnapshot.usdcBalance ?? "0.00"}`} />
          <MiniStat label="Gas" value={walletSnapshot.maticFormatted} />
          <MiniStat label="Checks" value={`${walletChecksPassed}/5`} />
          <MiniStat label="Signature" value={walletSnapshot.walletVerified ? "Verified" : "Pending"} />
        </div>
      </RailPanel>

      <RailPanel title="Live Blockers" eyebrow="Server Truth">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{runtimeLabel(serverStatus)}</p>
            <p className="mt-1 text-xs text-slate-400">Config: {system?.configSourceLabel ?? "Unavailable"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${blockerCount > 0 ? "bg-amber-500/15 text-amber-100" : "bg-emerald-500/15 text-emerald-100"}`}>
            {blockerCount > 0 ? `${blockerCount} active` : "Clear"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {(system?.blockers.slice(0, 3) ?? []).map((blocker) => (
            <div key={blocker.code} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <p className="font-semibold">{blocker.label}</p>
              <p className="mt-1 text-amber-50/80">{blocker.detail}</p>
            </div>
          ))}
          {blockerCount === 0 && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              Backend status is not reporting active live blockers.
            </div>
          )}
        </div>
      </RailPanel>

      <RailPanel title="Recent Activity" eyebrow="Operator Feed">
        {recentLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity is visible yet.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                <p className="text-xs leading-5 text-slate-200">{log.message}</p>
                <p className="mt-1 text-[11px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </RailPanel>

      <RailPanel title="Quick Actions" eyebrow="Shortcuts">
        <div className="grid gap-2">
          {[
            { id: "dashboard", label: "Open Dashboard" },
            { id: "markets", label: "Browse Markets" },
            { id: "automation", label: "Open Automation" },
            { id: "results", label: "Open Results" },
          ].map((action) => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:bg-slate-900"
            >
              {action.label}
            </button>
          ))}
        </div>
      </RailPanel>
    </aside>
  );
}

function RailPanel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-4 shadow-[0_18px_45px_rgba(2,6,23,0.35)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-100">{value}</p>
    </div>
  );
}