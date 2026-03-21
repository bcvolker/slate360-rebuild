"use client";

import React from "react";
import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";

interface MarketActivityFeedProps {
  logs: MarketActivityLogEntry[];
  title?: string;
  emptyLabel?: string;
  compact?: boolean;
}

export default function MarketActivityFeed({ logs, title = "Auto-buy activity", emptyLabel = "No activity yet", compact = false }: MarketActivityFeedProps) {
  const recentLogs = logs.slice(0, compact ? 6 : 10);
  const latest = recentLogs[0] ?? null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live monitor</p>
          <h3 className="mt-1 text-lg font-black text-slate-100">{title}</h3>
        </div>
        <span className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-slate-400">{recentLogs.length} recent events</span>
      </div>

      {latest ? (
        <div className="mt-4 rounded-2xl border border-orange-400/25 bg-orange-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">Latest event</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{latest.message}</p>
          <p className="mt-2 text-xs text-slate-400">{new Date(latest.created_at).toLocaleString()}</p>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-sm text-slate-500">{emptyLabel}</p>
      )}

      {recentLogs.length > 0 && (
        <div className="mt-4 space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-slate-200">{log.message}</p>
                <p className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}