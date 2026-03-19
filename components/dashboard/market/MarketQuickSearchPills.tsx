"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PRESETS = [
  { id: "weather-hour", label: "Weather", hint: "Topic: Weather · Time: Next hour · Sort: Ending" },
  { id: "bitcoin-month", label: "Bitcoin", hint: "Search: bitcoin · Topic: Crypto · Time: This month · Sort: Active" },
  { id: "election-week", label: "Elections", hint: "Search: election · Topic: Politics · Time: This week · Sort: Active" },
  { id: "closing-soon", label: "Closing soon", hint: "Time: Today · Sort: Ending" },
  { id: "high-liquidity", label: "Deep liquidity", hint: "Vol ≥$50k · Liq ≥$50k · Sort: Active" },
  { id: "moonshots", label: "Moonshots", hint: "Chance 5–35% · Vol ≥$1k · Time: This month · Sort: Value" },
] as const;

export default function MarketQuickSearchPills({ onApplyPreset }: { onApplyPreset: (presetId: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <Tooltip key={preset.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onApplyPreset(preset.id)}
              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-[#FF4D00]/40 hover:text-orange-200"
            >
              {preset.label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-52 text-[10px]">{preset.hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}