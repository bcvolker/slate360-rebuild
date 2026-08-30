"use client";

import { NAV_MODE_LABEL, NAV_MODES, type NavMode } from "@/lib/spatial-walkthrough/nav-mode";

type Props = {
  mode: NavMode;
  onChange: (mode: NavMode) => void;
};

export function NavModeBar({ mode, onChange }: Props) {
  return (
    <div className="sw-nav-modes" role="tablist" aria-label="Walkthrough mode">
      {NAV_MODES.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          className="sw-chrome-btn"
          data-accent={mode === id}
          onClick={() => onChange(id)}
        >
          {NAV_MODE_LABEL[id]}
        </button>
      ))}
    </div>
  );
}
