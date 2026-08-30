"use client";

import { COMPARE_MODE_LABEL, type CompareMode } from "@/lib/spatial-walkthrough/compare-mode";

type Props = {
  modes: CompareMode[];
  mode: CompareMode;
  onMode: (mode: CompareMode) => void;
};

export function CompareModeBar({ modes, mode, onMode }: Props) {
  return (
    <div className="sw-compare-modes" role="tablist" aria-label="Compare view">
      {modes.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          aria-pressed={mode === id}
          onClick={() => onMode(id)}
        >
          {COMPARE_MODE_LABEL[id]}
        </button>
      ))}
    </div>
  );
}
