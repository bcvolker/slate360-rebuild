"use client";

import React from "react";
import MarketNumericInput from "@/components/dashboard/market/MarketNumericInput";
import type { AutomationPlan, FillPolicy, ExitRules } from "@/components/dashboard/market/types";

interface MarketAutomationDetailControlsProps {
  draft: AutomationPlan;
  level: "intermediate" | "advanced";
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
}

export default function MarketAutomationDetailControls({
  draft,
  level,
  onFieldChange,
}: MarketAutomationDetailControlsProps) {
  return (
    <>
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Intermediate</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Max % Per Trade</label>
            <MarketNumericInput
              value={draft.maxPctPerTrade}
              min={1}
              max={100}
              fallback={10}
              onCommit={(value) => onFieldChange("maxPctPerTrade", value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fee Alert Threshold ($)</label>
            <MarketNumericInput
              value={draft.feeAlertThreshold}
              min={0}
              fallback={5}
              onCommit={(value) => onFieldChange("feeAlertThreshold", value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cooldown After Loss Streak (trades)</label>
          <MarketNumericInput
            value={draft.cooldownAfterLossStreak}
            min={0}
            max={10}
            fallback={2}
            onCommit={(value) => onFieldChange("cooldownAfterLossStreak", value)}
          />
        </div>
        <ToggleRow
          label="Large-Trader Signals"
          checked={draft.largeTraderSignals}
          onToggle={() => onFieldChange("largeTraderSignals", !draft.largeTraderSignals)}
        />
        <ToggleRow
          label="Closing-Soon Focus"
          checked={draft.closingSoonFocus}
          onToggle={() => onFieldChange("closingSoonFocus", !draft.closingSoonFocus)}
        />
      </div>

      {level === "advanced" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Advanced</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slippage (%)</label>
              <MarketNumericInput
                value={draft.slippage}
                min={0}
                max={20}
                fallback={2}
                onCommit={(value) => onFieldChange("slippage", value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Liquidity ($)</label>
              <MarketNumericInput
                value={draft.minimumLiquidity}
                min={0}
                fallback={1000}
                onCommit={(value) => onFieldChange("minimumLiquidity", value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Spread (%)</label>
              <MarketNumericInput
                value={draft.maximumSpread}
                min={0}
                max={50}
                fallback={5}
                onCommit={(value) => onFieldChange("maximumSpread", value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fill Policy</label>
              <select
                value={draft.fillPolicy}
                onChange={(e) => onFieldChange("fillPolicy", e.target.value as FillPolicy)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
              >
                <option value="conservative">Conservative</option>
                <option value="aggressive">Aggressive</option>
                <option value="limit-only">Limit Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Exit Rules</label>
              <select
                value={draft.exitRules}
                onChange={(e) => onFieldChange("exitRules", e.target.value as ExitRules)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
              >
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
                <option value="trailing-stop">Trailing Stop</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={onToggle} className={`relative w-10 h-5 rounded-full transition ${checked ? "bg-[#1E3A8A]" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}