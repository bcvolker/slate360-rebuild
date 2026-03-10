"use client";

import React from "react";
import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";

interface MarketActivityFeedProps {
  logs: MarketActivityLogEntry[];
  title?: string;
  emptyLabel?: string;
  compact?: boolean;
}

export default function MarketActivityFeed({ logs, title = "Robot activity", emptyLabel = "No activity yet", compact = false }: MarketActivityFeedProps) {
  const recentLogs = logs.slice(0, compact ? 6 : 10);
  const latest = recentLogs[0] ?? null;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live monitor</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{recentLogs.length} recent events</span>
      </div>

      {latest ? (
        <div className="mt-4 rounded-3xl border border-orange-200 bg-[linear-gradient(135deg,rgba(255,121,47,0.12),rgba(255,255,255,0.88))] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">Latest event</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{latest.message}</p>
          <p className="mt-2 text-xs text-slate-500">{new Date(latest.created_at).toLocaleString()}</p>
        </div>
      ) : (
        <p className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-400">{emptyLabel}</p>
      )}

      {recentLogs.length > 0 && (
        <div className="mt-4 space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-slate-700">{log.message}</p>
                <p className="text-[11px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}