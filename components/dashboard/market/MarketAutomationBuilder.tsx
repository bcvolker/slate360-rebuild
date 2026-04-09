"use client";
import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import MarketAutomationDetailControls from "@/components/dashboard/market/MarketAutomationDetailControls";
import MarketPlanInsights from "@/components/dashboard/market/MarketPlanInsights";
import MarketNumericInput from "@/components/dashboard/market/MarketNumericInput";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import {
  applyAutomationPreset,
  detectAutomationPreset,
  getAutomationPresetLabel,
  type AutomationPresetKey,
} from "@/lib/market/automation-presets";
import type { AutomationPlan, RiskLevel, ScanMode } from "@/components/dashboard/market/types";

interface MarketAutomationBuilderProps {
  draft: AutomationPlan;
  editingId: string | null;
  controlLevel: "basic" | "intermediate" | "advanced";
  onControlLevelChange: (level: "basic" | "intermediate" | "advanced") => void;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
  onSave: () => void;
  onSaveAndApply: () => void;
  onReset: () => void;
}

export default function MarketAutomationBuilder({
  draft, editingId, controlLevel,
  onControlLevelChange, onFieldChange, onSave, onSaveAndApply, onReset,
}: MarketAutomationBuilderProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const selectedPreset = detectAutomationPreset(draft);

  const toggleCategory = (cat: string) => {
    const next = draft.categories.includes(cat)
      ? draft.categories.filter(c => c !== cat)
      : [...draft.categories, cat];
    onFieldChange("categories", next);
  };

  const applyPreset = (preset: AutomationPresetKey) => {
    const next = applyAutomationPreset(draft, preset);
    onFieldChange("riskLevel", next.riskLevel);
    onFieldChange("budget", next.budget);
    onFieldChange("maxTradesPerDay", next.maxTradesPerDay);
    onFieldChange("maxDailyLoss", next.maxDailyLoss);
    onFieldChange("maxOpenPositions", next.maxOpenPositions);
    onFieldChange("scanMode", next.scanMode);
    onFieldChange("maxPctPerTrade", next.maxPctPerTrade);
    onFieldChange("minimumLiquidity", next.minimumLiquidity);
    onFieldChange("maximumSpread", next.maximumSpread);
    onFieldChange("largeTraderSignals", next.largeTraderSignals);
    onFieldChange("closingSoonFocus", next.closingSoonFocus);
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/80 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">
          {editingId ? "Edit Plan" : "Create an Auto-Buy Plan"}
          <HelpTip content="Set how much to spend, what risk level, and which topics to focus on." />
        </h3>
      </div>

      {/* Control level selector */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Choose a quick preset</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(["conservative", "balanced", "aggressive"] as const).map((preset) => {
            const active = selectedPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-[#D4AF37] bg-amber-500/15 text-orange-200"
                    : "border-zinc-800 bg-zinc-950/80 text-slate-300 hover:border-zinc-700"
                }`}
              >
                <p className="text-xs font-semibold">{getAutomationPresetLabel(preset)}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {preset === "conservative" && "Slower scans, tighter guardrails, smaller daily risk."}
                  {preset === "balanced" && "Default blend of cadence, risk, and position sizing."}
                  {preset === "aggressive" && "Faster scans, wider limits, higher daily volatility."}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Presets are frontend guidance only. They map to existing plan fields and do not change backend contracts.
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-2">Preset currently matched</p>
        <p className="text-sm font-medium text-slate-200">
          {selectedPreset ? getAutomationPresetLabel(selectedPreset) : "Custom"}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="w-full text-left text-xs font-semibold text-slate-300"
        >
          {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
        </button>
        {showAdvanced && (
          <>
            <p className="text-[11px] text-slate-500 mt-2">Basic controls are shown by default. Use this area only if you need tighter control over execution behavior.</p>
            <p className="text-xs text-slate-400 mt-3 mb-2">Detail level</p>
            <div className="flex gap-1">
              {(["basic", "intermediate", "advanced"] as const).map(lvl => (
                <button key={lvl} onClick={() => onControlLevelChange(lvl)}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                    controlLevel === lvl ? "bg-[#D4AF37] text-white" : "bg-slate-800 text-slate-400 hover:bg-zinc-800"
                  }`}>
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Intermediate and Advanced keep granular controls available without cluttering the primary path.
            </p>
          </>
        )}
      </div>

      {/* Plan name */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Plan Name</label>
        <input type="text" placeholder="e.g. Conservative Scanner Q1" value={draft.name}
          onChange={e => onFieldChange("name", e.target.value)}
          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#D4AF37]" />
      </div>

      {/* Basic controls — always show */}
      <BasicControls draft={draft} onFieldChange={onFieldChange} toggleCategory={toggleCategory} />

      {/* Intermediate and advanced controls remain available through disclosure */}
      {showAdvanced && (controlLevel === "intermediate" || controlLevel === "advanced") && (
        <MarketAutomationDetailControls
          draft={draft}
          level={controlLevel}
          onFieldChange={onFieldChange}
        />
      )}

      <MarketPlanInsights draft={draft} />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={!draft.name.trim()}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 text-slate-200">
          {editingId ? "Save Draft Changes" : "Save Draft"}
        </button>
        <button onClick={onSaveAndApply} disabled={!draft.name.trim()}
          className="flex-1 bg-[#D4AF37] hover:bg-amber-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 text-white">
          ▶ {editingId ? "Save + Start Auto-Buy" : "Save + Start Auto-Buy"}
        </button>
        {editingId && (
          <button onClick={onReset}
            className="px-4 py-2 bg-slate-800 hover:bg-zinc-800 rounded-lg text-sm transition text-slate-300">
            Cancel
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Save Draft stores your plan. Save + Start Auto-Buy stores the plan, requests runtime start, and triggers a scan. Runtime status is server-confirmed separately.
      </p>
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
          <label className="text-xs text-slate-400 mb-1 flex items-center">
              Total budget ($) <HelpTip content="The maximum capital this plan is allowed to use." />
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
          <label className="text-xs text-slate-400 mb-1 flex items-center">
            Mode <HelpTip content="Practice = no real money. Real = live trades." />
          </label>
          <div className="flex gap-1">
            {(["practice", "real"] as const).map(m => (
              <button key={m} onClick={() => onFieldChange("mode", m)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                  draft.mode === m ? (m === "practice" ? "bg-purple-600 text-white" : "bg-green-600 text-white") : "bg-slate-800 text-slate-400 hover:bg-zinc-800"
                }`}>
                {m === "practice" ? "🧪 Practice" : "💵 Real"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 flex items-center">
          Risk Level <HelpTip content="Conservative = low risk/reward. Aggressive = high risk/reward." />
        </label>
        <div className="flex gap-1">
          {(["conservative", "balanced", "aggressive"] as const).map(r => (
            <button key={r} onClick={() => onFieldChange("riskLevel", r as RiskLevel)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                draft.riskLevel === r ? "bg-[#D4AF37] text-white" : "bg-slate-800 text-slate-400 hover:bg-zinc-800"
              }`}>
              {r === "conservative" ? "Safe" : r === "balanced" ? "Balanced" : "Aggressive"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 flex items-center">
            Daily trade cap <HelpTip content="The most buys the system can make in one day." />
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
          <label className="text-xs text-slate-400 mb-1 flex items-center">
            Stop after losing this much today ($) <HelpTip content="When losses hit this amount in one day, buying pauses automatically." />
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
          <label className="text-xs text-slate-400 mb-1 flex items-center">
            Max positions at once <HelpTip content="The most active bets the system can hold at once." />
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
          <label className="text-xs text-slate-400 mb-1 flex items-center">
            How often to scan <HelpTip content="Controls how often the system scans for new markets. Faster = more buys, but also more noise." />
          </label>
          <select value={draft.scanMode} onChange={e => onFieldChange("scanMode", e.target.value as ScanMode)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D4AF37]">
            {(["slow", "balanced", "fast", "closing-soon"] as const).map(s => (
              <option key={s} value={s}>{s === "closing-soon" ? "Soon-ending only" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-2 flex items-center">
          Categories <HelpTip content="Market categories this plan targets." />
        </label>
        <div className="flex flex-wrap gap-1">
          {FOCUS_AREAS.map(area => (
            <button key={area} onClick={() => toggleCategory(area)}
              className={`px-2 py-0.5 text-xs rounded-lg transition ${
                draft.categories.includes(area) ? "bg-[#D4AF37] text-blue-200" : "bg-slate-800 text-slate-500 hover:bg-zinc-800"
              }`}>
              {area}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Budget = total money the robot can use. Daily cap = max buys per day. Positions = how many open bets at once.
        </p>
      </div>
    </>
  );
}
