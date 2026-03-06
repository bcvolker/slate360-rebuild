"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { SimRun, SimulationConfig } from "@/components/dashboard/market/types";

interface ComparePoint { label: string; a: number | null; b: number | null }

interface MarketSimulationPanelProps {
  simRuns: SimRun[];
  compareA: string | null;
  compareB: string | null;
  compareRunA: SimRun | undefined;
  compareRunB: SimRun | undefined;
  compareChartData: ComparePoint[];
  hasTrades: boolean;
  simConfig: SimulationConfig;
  onSimConfigChange: (config: SimulationConfig) => void;
  onCompareAChange: (id: string | null) => void;
  onCompareBChange: (id: string | null) => void;
  onSaveCurrentSim: () => void;
  onDeleteRun: (id: string) => void;
}

function SimLabel({ run }: { run: SimRun }) {
  return (
    <span className="text-[10px] text-gray-400">
      {run.fillModel ?? "realistic"} fills · fees {run.feeMode !== false ? "on" : "off"} ·{" "}
      partial fills {run.partialFills ? "on" : "off"}
      {run.startingBalance ? ` · $${run.startingBalance} start` : ""}
    </span>
  );
}

export default function MarketSimulationPanel({
  simRuns, compareA, compareB, compareRunA, compareRunB,
  compareChartData, hasTrades, simConfig, onSimConfigChange,
  onCompareAChange, onCompareBChange, onSaveCurrentSim, onDeleteRun,
}: MarketSimulationPanelProps) {
  const updateConfig = (patch: Partial<SimulationConfig>) =>
    onSimConfigChange({ ...simConfig, ...patch });

  return (
    <div className="space-y-5">
      {/* Simulation configuration */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center gap-1">
            🧪 Simulation Settings
            <HelpTip content="Configure how the simulation models trades. Realistic fills add slippage and partial execution. Fee mode includes gas and trading fees." />
          </h3>
          {hasTrades && (
            <button onClick={onSaveCurrentSim}
              className="bg-[#FF4D00] hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-bold transition text-white">
              💾 Save Snapshot
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Starting Balance ($)</label>
            <input
              type="number" min={10} max={100000} value={simConfig.startingBalance}
              onChange={e => updateConfig({ startingBalance: Math.max(10, Number(e.target.value) || 500) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center">
              Fill Model <HelpTip content="Realistic: adds slippage and imperfect fills. Ideal: assumes perfect execution at displayed price." />
            </label>
            <div className="flex gap-1">
              {(["realistic", "ideal"] as const).map(fm => (
                <button key={fm} onClick={() => updateConfig({ fillModel: fm })}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                    simConfig.fillModel === fm ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {fm === "realistic" ? "Realistic" : "Ideal"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <button onClick={() => updateConfig({ feeMode: !simConfig.feeMode })}
                className={`relative w-10 h-5 rounded-full transition ${simConfig.feeMode ? "bg-[#FF4D00]" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${simConfig.feeMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-gray-600">Fees on</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <button onClick={() => updateConfig({ partialFills: !simConfig.partialFills })}
                className={`relative w-10 h-5 rounded-full transition ${simConfig.partialFills ? "bg-[#FF4D00]" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${simConfig.partialFills ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-gray-600">Partial fills</span>
            </label>
          </div>
        </div>
      </div>

      {/* Comparison section */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-1">
          📊 Compare Simulations
          <HelpTip content="Compare PNL curves from two saved simulation snapshots side by side." />
        </h3>

        {simRuns.length < 2 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500 text-sm mb-2">Save at least 2 snapshots to compare strategies</p>
            <p className="text-gray-400 text-xs">Run trades with different settings, then save each as a snapshot</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["A", "B"] as const).map(side => {
                const val = side === "A" ? compareA : compareB;
                const setter = side === "A" ? onCompareAChange : onCompareBChange;
                return (
                  <div key={side}>
                    <label className="text-xs text-gray-500 mb-1 block">Run {side}</label>
                    <select value={val || ""} onChange={e => setter(e.target.value || null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
                      <option value="">— Select run {side} —</option>
                      {simRuns.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {compareRunA && compareRunB && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[compareRunA, compareRunB].map((run, idx) => (
                    <div key={run.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${idx === 0 ? "border-[#FF4D00]/40" : "border-[#1E3A8A]/40"}`}>
                      <p className={`text-xs font-bold mb-1 ${idx === 0 ? "text-[#FF4D00]" : "text-[#1E3A8A]"}`}>
                        Run {idx === 0 ? "A" : "B"}: {run.name}
                      </p>
                      <SimLabel run={run} />
                      <div className="grid grid-cols-3 gap-2 text-center mt-2">
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

                <CompareChart data={compareChartData} nameA={compareRunA.name} nameB={compareRunB.name} />
              </>
            )}
          </>
        )}
      </div>

      {/* Saved snapshots */}
      {simRuns.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Saved Snapshots ({simRuns.length}/{10})
          </h4>
          {simRuns.map(run => (
            <div key={run.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800 font-medium">{run.name}</p>
                <p className="text-xs text-gray-400">
                  {run.trade_count} trades · {run.win_rate}% win · ${run.total_pnl.toFixed(2)} p/l · {run.config.risk_mix}
                </p>
                <SimLabel run={run} />
              </div>
              <button onClick={() => onDeleteRun(run.id)}
                className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareChart({ data, nameA, nameB }: { data: ComparePoint[]; nameA: string; nameB: string }) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No PNL data in selected runs</div>;
  }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Cumulative Profit / Loss Comparison</h4>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
          <RechartsTooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" }}
            formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, ""]}
          />
          <Legend />
          <Line type="monotone" dataKey="a" name={nameA.slice(0, 20)} stroke="#FF4D00" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="b" name={nameB.slice(0, 20)} stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
