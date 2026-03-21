"use client";

import React from "react";
import MarketNumericInput from "@/components/dashboard/market/MarketNumericInput";
import type { AutomationPlan } from "@/components/dashboard/market/types";

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
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Intermediate</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Max % Per Trade</label>
            <MarketNumericInput
              value={draft.maxPctPerTrade}
              min={1}
              max={100}
              fallback={10}
              onCommit={(value) => onFieldChange("maxPctPerTrade", value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fee Alert Threshold ($)</label>
            <MarketNumericInput
              value={draft.feeAlertThreshold}
              min={0}
              fallback={5}
              onCommit={(value) => onFieldChange("feeAlertThreshold", value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Cooldown After Loss Streak (trades)</label>
          <MarketNumericInput
            value={draft.cooldownAfterLossStreak}
            min={0}
            max={10}
            fallback={2}
            onCommit={(value) => onFieldChange("cooldownAfterLossStreak", value)}
          />
        </div>
        <ToggleRow
          label="Follow high-volume activity"
          checked={draft.largeTraderSignals}
          onToggle={() => onFieldChange("largeTraderSignals", !draft.largeTraderSignals)}
        />
        <ToggleRow
          label="Prioritize ending-soon markets"
          checked={draft.closingSoonFocus}
          onToggle={() => onFieldChange("closingSoonFocus", !draft.closingSoonFocus)}
        />
      </div>

      {level === "advanced" && (
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Advanced</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Min Liquidity ($)</label>
              <MarketNumericInput
                value={draft.minimumLiquidity}
                min={0}
                fallback={1000}
                onCommit={(value) => onFieldChange("minimumLiquidity", value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Max Spread (%)</label>
              <MarketNumericInput
                value={draft.maximumSpread}
                min={0}
                max={50}
                fallback={5}
                onCommit={(value) => onFieldChange("maximumSpread", value)}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Advanced execution settings are coming in a future update.
          </p>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button onClick={onToggle} className={`relative w-10 h-5 rounded-full transition ${checked ? "bg-[#FF4D00]" : "bg-slate-600"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-200 shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}