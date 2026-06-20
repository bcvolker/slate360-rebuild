"use client";

import { useState } from "react";

/**
 * The standard Content Studio control idiom: a square toggle that, when ON,
 * reveals a single 0–100% strength slider (collapsed by default). One click for
 * the preset; one expand to dial it back if it's too strong. No pills, no chips.
 */
export function LevelDisclosureRow({
  label,
  defaultOn = false,
  defaultStrength = 50,
  onChange,
}: {
  label: string;
  defaultOn?: boolean;
  defaultStrength?: number;
  onChange?: (state: { on: boolean; strength: number }) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  const [strength, setStrength] = useState(defaultStrength);

  function setOnState(next: boolean) {
    setOn(next);
    onChange?.({ on: next, strength });
  }
  function setStrengthState(next: number) {
    setStrength(next);
    onChange?.({ on, strength: next });
  }

  return (
    <div
      className={`rounded-md border p-3 ${
        on ? "border-l-2 border-l-[#3D8EFF] border-y-white/10 border-r-white/10 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOnState(!on)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm text-white/90">{label}</span>
        <span
          className={`flex h-5 w-9 items-center rounded-md border px-0.5 ${
            on ? "justify-end border-[#3D8EFF] bg-[#3D8EFF]/30" : "justify-start border-white/15 bg-white/10"
          }`}
        >
          <span className="h-3.5 w-3.5 rounded-sm bg-white" />
        </span>
      </button>

      {on && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            Strength
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={strength}
            onChange={(e) => setStrengthState(Number(e.target.value))}
            className="h-1 flex-1 accent-[#3D8EFF]"
          />
          <span className="w-9 text-right font-mono text-xs tabular-nums text-white/80">
            {strength}%
          </span>
        </div>
      )}
    </div>
  );
}
