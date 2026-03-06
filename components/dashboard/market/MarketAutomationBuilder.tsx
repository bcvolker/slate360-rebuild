"use client";
import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { AutomationPlan, RiskLevel, ScanMode, FillPolicy, ExitRules } from "@/components/dashboard/market/types";

interface MarketAutomationBuilderProps {
  draft: AutomationPlan;
  editingId: string | null;
  controlLevel: "basic" | "intermediate" | "advanced";
  onControlLevelChange: (level: "basic" | "intermediate" | "advanced") => void;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
  onSave: () => void;
  onReset: () => void;
}

export default function MarketAutomationBuilder({
  draft, editingId, controlLevel,
  onControlLevelChange, onFieldChange, onSave, onReset,
}: MarketAutomationBuilderProps) {
  const toggleCategory = (cat: string) => {
    const next = draft.categories.includes(cat)
      ? draft.categories.filter(c => c !== cat)
      : [...draft.categories, cat];
    onFieldChange("categories", next);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          {editingId ? "Edit Plan" : "New Automation Plan"}
          <HelpTip content="Create or edit a saved automation plan the robot can run. Choose your level of control below." />
        </h3>
      </div>

      {/* Control level selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Control level</p>
        <div className="flex gap-1">
          {(["basic", "intermediate", "advanced"] as const).map(lvl => (
            <button key={lvl} onClick={() => onControlLevelChange(lvl)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                controlLevel === lvl ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Plan name */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Plan Name</label>
        <input type="text" placeholder="e.g. Conservative Scanner Q1" value={draft.name}
          onChange={e => onFieldChange("name", e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00]" />
      </div>

      {/* Basic controls — always show */}
      <BasicControls draft={draft} onFieldChange={onFieldChange} toggleCategory={toggleCategory} />

      {/* Intermediate controls */}
      {(controlLevel === "intermediate" || controlLevel === "advanced") && (
        <IntermediateControls draft={draft} onFieldChange={onFieldChange} />
      )}

      {/* Advanced controls */}
      {controlLevel === "advanced" && (
        <AdvancedControls draft={draft} onFieldChange={onFieldChange} />
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={!draft.name.trim()}
          className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 text-white">
          💾 {editingId ? "Update Plan" : "Save Plan"}
        </button>
        {editingId && (
          <button onClick={onReset}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition text-gray-700">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Basic Controls ─────────────────────────────────────────────── */
function BasicControls({ draft, onFieldChange, toggleCategory }: {
  draft: AutomationPlan;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
  toggleCategory: (cat: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Budget ($) <HelpTip content="Total capital the plan can use." />
          </label>
          <input type="number" min={10} max={100000} value={draft.budget}
            onChange={e => onFieldChange("budget", Math.max(10, Number(e.target.value) || 200))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Mode <HelpTip content="Practice = no real money. Real = live trades." />
          </label>
          <div className="flex gap-1">
            {(["practice", "real"] as const).map(m => (
              <button key={m} onClick={() => onFieldChange("mode", m)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                  draft.mode === m ? (m === "practice" ? "bg-purple-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {m === "practice" ? "🧪 Practice" : "💵 Real"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Risk Level <HelpTip content="Conservative = low risk/reward. Aggressive = high risk/reward." />
        </label>
        <div className="flex gap-1">
          {(["conservative", "balanced", "aggressive"] as const).map(r => (
            <button key={r} onClick={() => onFieldChange("riskLevel", r as RiskLevel)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                draft.riskLevel === r ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {r === "conservative" ? "Safe" : r === "balanced" ? "Balanced" : "Aggressive"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max Trades/Day <HelpTip content="Cap on how many trades the robot makes per day." />
          </label>
          <input type="number" min={1} max={50} value={draft.maxTradesPerDay}
            onChange={e => onFieldChange("maxTradesPerDay", Math.max(1, Number(e.target.value) || 5))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max Daily Loss ($) <HelpTip content="Stop trading when losses exceed this amount in a single day." />
          </label>
          <input type="number" min={5} value={draft.maxDailyLoss}
            onChange={e => onFieldChange("maxDailyLoss", Math.max(5, Number(e.target.value) || 40))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max Open Positions <HelpTip content="Max number of concurrent open trades." />
          </label>
          <input type="number" min={1} max={20} value={draft.maxOpenPositions}
            onChange={e => onFieldChange("maxOpenPositions", Math.max(1, Number(e.target.value) || 3))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Scan Mode <HelpTip content="How frequently and aggressively the robot scans for opportunities." />
          </label>
          <select value={draft.scanMode} onChange={e => onFieldChange("scanMode", e.target.value as ScanMode)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            {(["slow", "balanced", "fast", "closing-soon"] as const).map(s => (
              <option key={s} value={s}>{s === "closing-soon" ? "Closing Soon" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 flex items-center">
          Categories <HelpTip content="Market categories this plan targets." />
        </label>
        <div className="flex flex-wrap gap-1">
          {FOCUS_AREAS.map(area => (
            <button key={area} onClick={() => toggleCategory(area)}
              className={`px-2 py-0.5 text-xs rounded-full transition ${
                draft.categories.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}>
              {area}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Intermediate Controls ──────────────────────────────────────── */
function IntermediateControls({ draft, onFieldChange }: {
  draft: AutomationPlan;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Intermediate</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Max % Per Trade</label>
          <input type="number" min={1} max={100} value={draft.maxPctPerTrade}
            onChange={e => onFieldChange("maxPctPerTrade", Math.max(1, Number(e.target.value) || 10))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Fee Alert Threshold ($)</label>
          <input type="number" min={0} value={draft.feeAlertThreshold}
            onChange={e => onFieldChange("feeAlertThreshold", Math.max(0, Number(e.target.value) || 5))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Cooldown After Loss Streak (trades)</label>
        <input type="number" min={0} max={10} value={draft.cooldownAfterLossStreak}
          onChange={e => onFieldChange("cooldownAfterLossStreak", Math.max(0, Number(e.target.value) || 2))}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 flex items-center">
          Large-Trader Signals <HelpTip content="Follow large trades as a signal." />
        </span>
        <button onClick={() => onFieldChange("largeTraderSignals", !draft.largeTraderSignals)}
          className={`relative w-10 h-5 rounded-full transition ${draft.largeTraderSignals ? "bg-[#1E3A8A]" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft.largeTraderSignals ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 flex items-center">
          Closing-Soon Focus <HelpTip content="Prioritize markets about to resolve." />
        </span>
        <button onClick={() => onFieldChange("closingSoonFocus", !draft.closingSoonFocus)}
          className={`relative w-10 h-5 rounded-full transition ${draft.closingSoonFocus ? "bg-[#1E3A8A]" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft.closingSoonFocus ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

/* ── Advanced Controls ──────────────────────────────────────────── */
function AdvancedControls({ draft, onFieldChange }: {
  draft: AutomationPlan;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Advanced</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Slippage (%)</label>
          <input type="number" min={0} max={20} step={0.5} value={draft.slippage}
            onChange={e => onFieldChange("slippage", Math.max(0, Number(e.target.value) || 2))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Min Liquidity ($)</label>
          <input type="number" min={0} value={draft.minimumLiquidity}
            onChange={e => onFieldChange("minimumLiquidity", Math.max(0, Number(e.target.value) || 1000))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Max Spread (%)</label>
          <input type="number" min={0} max={50} value={draft.maximumSpread}
            onChange={e => onFieldChange("maximumSpread", Math.max(0, Number(e.target.value) || 5))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Fill Policy</label>
          <select value={draft.fillPolicy} onChange={e => onFieldChange("fillPolicy", e.target.value as FillPolicy)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            <option value="conservative">Conservative</option>
            <option value="aggressive">Aggressive</option>
            <option value="limit-only">Limit Only</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Exit Rules</label>
          <select value={draft.exitRules} onChange={e => onFieldChange("exitRules", e.target.value as ExitRules)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
            <option value="trailing-stop">Trailing Stop</option>
          </select>
        </div>
      </div>
    </div>
  );
}
