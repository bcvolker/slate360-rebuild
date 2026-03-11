"use client";

const PRESETS = [
  { id: "weather-hour", label: "Weather soon", detail: "Storms and forecast markets ending soon" },
  { id: "bitcoin-month", label: "Bitcoin movers", detail: "BTC markets with longer runway" },
  { id: "election-week", label: "Election pulse", detail: "Politics markets ending this week" },
  { id: "closing-soon", label: "Closing soon", detail: "Near-term markets with active volume" },
  { id: "high-liquidity", label: "Deep liquidity", detail: "Large markets with tighter execution" },
  { id: "moonshots", label: "Moonshots", detail: "Low-probability, high-upside ideas" },
] as const;

export default function MarketQuickSearchPills({ onApplyPreset }: { onApplyPreset: (presetId: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Idea lanes</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset.id)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-[#FF4D00]/30 hover:bg-orange-50"
          >
            <p className="text-sm font-semibold text-slate-800">{preset.label}</p>
            <p className="mt-1 text-xs text-slate-500">{preset.detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}