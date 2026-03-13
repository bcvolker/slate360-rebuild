"use client";

const PRESETS = [
  { id: "weather-hour", label: "Weather" },
  { id: "bitcoin-month", label: "Bitcoin" },
  { id: "election-week", label: "Elections" },
  { id: "closing-soon", label: "Closing soon" },
  { id: "high-liquidity", label: "Deep liquidity" },
  { id: "moonshots", label: "Moonshots" },
] as const;

export default function MarketQuickSearchPills({ onApplyPreset }: { onApplyPreset: (presetId: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onApplyPreset(preset.id)}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-[#FF4D00]/40 hover:text-orange-200"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}