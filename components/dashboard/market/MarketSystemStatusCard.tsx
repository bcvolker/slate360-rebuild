"use client";

import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketSystemStatusViewModel } from "@/lib/market/contracts";

function blockerTone(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function MarketSystemStatusCard({
  system,
  loading,
  error,
  title = "System status",
}: {
  system: MarketSystemStatusViewModel | null;
  loading: boolean;
  error: string | null;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {loading ? "Checking configuration and runtime state…" : error ? error : system?.recommendation ?? "No system summary yet."}
          </p>
        </div>
        <StatusBadge status={system?.runtimeStatus ?? "unknown"} />
      </div>

      {system && !loading && !error && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-400">Config source</p>
              <p className="mt-1 font-semibold text-slate-800">{system.configSourceLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-400">Open-position cap</p>
              <p className="mt-1 font-semibold text-slate-800">{system.effectiveMaxOpenPositions}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-400">Runs today</p>
              <p className="mt-1 font-semibold text-slate-800">{system.runsToday}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-400">Live server</p>
              <p className={`mt-1 font-semibold ${system.liveServerReady ? "text-emerald-700" : "text-red-700"}`}>
                {system.liveServerReady ? "Ready" : "Blocked"}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Saved plans: <span className="font-semibold text-slate-700">{system.planCount}</span>
          </p>

          {system.blockers.length > 0 && (
            <div className="mt-3 space-y-2">
              {system.blockers.slice(0, 3).map((blocker) => (
                <div key={blocker.code} className={`rounded-xl border px-3 py-2 text-xs ${blockerTone(blocker.severity)}`}>
                  <p className="font-semibold">{blocker.label}</p>
                  <p className="mt-1 opacity-90">{blocker.detail}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}