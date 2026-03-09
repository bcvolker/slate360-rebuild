"use client";
import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import MarketAutomationDetailControls from "@/components/dashboard/market/MarketAutomationDetailControls";
import MarketNumericInput from "@/components/dashboard/market/MarketNumericInput";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { AutomationPlan, RiskLevel, ScanMode } from "@/components/dashboard/market/types";

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
        <span className="text-[11px] text-gray-400">Save closes this builder automatically</span>
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
        <p className="text-[11px] text-gray-400 mt-2">
          `Basic` is the recommended mode. `Intermediate` and `Advanced` expose extra controls that are not needed for most users.
        </p>
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
        <MarketAutomationDetailControls
          draft={draft}
          level={controlLevel}
          onFieldChange={onFieldChange}
        />
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
          <MarketNumericInput
            value={draft.budget}
            min={10}
            max={100000}
            fallback={200}
            onCommit={(value) => onFieldChange("budget", value)}
          />
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
          <MarketNumericInput
            value={draft.maxTradesPerDay}
            min={1}
            max={5000}
            fallback={5}
            onCommit={(value) => onFieldChange("maxTradesPerDay", value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max Daily Loss ($) <HelpTip content="Stop trading when losses exceed this amount in a single day." />
          </label>
          <MarketNumericInput
            value={draft.maxDailyLoss}
            min={5}
            fallback={40}
            onCommit={(value) => onFieldChange("maxDailyLoss", value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max Open Positions <HelpTip content="How many open positions the robot can hold at once." />
          </label>
          <MarketNumericInput
            value={draft.maxOpenPositions}
            min={1}
            max={5000}
            fallback={3}
            onCommit={(value) => onFieldChange("maxOpenPositions", value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Scan Mode <HelpTip content="How often the robot scans. Faster modes create more activity and more noise." />
          </label>
          <select value={draft.scanMode} onChange={e => onFieldChange("scanMode", e.target.value as ScanMode)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            {(["slow", "balanced", "fast", "closing-soon"] as const).map(s => (
              <option key={s} value={s}>{s === "closing-soon" ? "Soon-ending only" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
