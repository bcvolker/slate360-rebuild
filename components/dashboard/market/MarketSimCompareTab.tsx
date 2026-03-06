"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { SimRun } from "@/components/dashboard/market/types";

interface ComparePoint {
  label: string;
  a: number | null;
  b: number | null;
}

interface MarketSimCompareTabProps {
  simRuns: SimRun[];
  compareA: string | null;
  compareB: string | null;
  compareRunA: SimRun | undefined;
  compareRunB: SimRun | undefined;
  compareChartData: ComparePoint[];
  hasTrades: boolean;
  onCompareAChange: (id: string | null) => void;
  onCompareBChange: (id: string | null) => void;
  onSaveCurrentSim: () => void;
  onDeleteRun: (id: string) => void;
}

export default function MarketSimCompareTab({
  simRuns,
  compareA,
  compareB,
  compareRunA,
  compareRunB,
  compareChartData,
  hasTrades,
  onCompareAChange,
  onCompareBChange,
  onSaveCurrentSim,
  onDeleteRun,
}: MarketSimCompareTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center gap-1">
          📊 Simulation Comparison
          <HelpTip content="Compare PNL curves from two saved simulation runs side by side to evaluate different strategies." />
        </h3>
        {hasTrades && (
          <button onClick={onSaveCurrentSim}
            className="bg-[#FF4D00] hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-bold transition text-white">
            💾 Save Current Sim
          </button>
        )}
      </div>

      {simRuns.length < 2 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">You need at least 2 saved simulation runs to compare</p>
          <p className="text-gray-400 text-xs">Run the bot in paper mode with different configs, then save each run</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Run A</label>
              <select value={compareA || ""} onChange={e => onCompareAChange(e.target.value || null)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
                <option value="">— Select run A —</option>
                {simRuns.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Run B</label>
              <select value={compareB || ""} onChange={e => onCompareBChange(e.target.value || null)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
                <option value="">— Select run B —</option>
                {simRuns.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {compareRunA && compareRunB && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[compareRunA, compareRunB].map((run, idx) => (
                  <div key={run.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${idx === 0 ? "border-[#FF4D00]/40" : "border-[#1E3A8A]/40"}`}>
                    <p className={`text-xs font-bold mb-2 ${idx === 0 ? "text-[#FF4D00]" : "text-[#1E3A8A]"}`}>
                      {idx === 0 ? "Run A" : "Run B"}: {run.name}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400">Total P/L</p>
                        <p className={`text-sm font-bold ${run.total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {run.total_pnl >= 0 ? "+" : ""}${run.total_pnl.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Win Rate</p>
                        <p className="text-sm font-bold text-gray-900">{run.win_rate}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Trades</p>
                        <p className="text-sm font-bold text-gray-900">{run.trade_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Cumulative Profit / Loss Comparison</h4>
                {compareChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={compareChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
                      <RechartsTooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" }}
                        formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, ""]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="a" name={compareRunA.name.slice(0, 20)} stroke="#FF4D00" strokeWidth={2} dot={false} connectNulls />
                      <Line type="monotone" dataKey="b" name={compareRunB.name.slice(0, 20)} stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No profit/loss data in selected runs</div>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <h4 className="text-xs text-gray-500 font-medium uppercase tracking-wider">All Saved Runs ({simRuns.length})</h4>
            {simRuns.map(run => (
              <div key={run.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-800 font-medium">{run.name}</p>
                  <p className="text-xs text-gray-400">{run.trade_count} trades · {run.win_rate}% win rate · ${run.total_pnl.toFixed(2)} p/l · {run.config.risk_mix}</p>
                </div>
                <button onClick={() => onDeleteRun(run.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
