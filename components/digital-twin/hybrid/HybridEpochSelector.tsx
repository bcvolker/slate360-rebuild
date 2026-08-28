"use client";

import type { TwinEpoch } from "@/lib/digital-twin/twin-epoch";

export function HybridEpochSelector({
  epochs,
  currentId,
  onChange,
}: {
  epochs: TwinEpoch[];
  currentId: string;
  onChange: (id: string) => void;
}) {
  if (epochs.length === 0) return null;
  return (
    <label className="pointer-events-auto absolute left-3 top-3 z-20">
      <span className="sr-only">Capture date</span>
      <select
        value={currentId}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Capture date"
        className="min-h-[44px] rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-3 text-xs font-medium uppercase tracking-wide text-white/80 outline-none backdrop-blur-xl"
      >
        {epochs.map((epoch) => (
          <option key={epoch.id} value={epoch.id} className="bg-[var(--graphite-canvas)]">
            {epoch.label}
          </option>
        ))}
      </select>
    </label>
  );
}
