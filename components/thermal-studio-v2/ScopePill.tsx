"use client";

import type { ThermalV2Scope, ThermalV2ScopeKind } from "./types";

/**
 * The single global Scope control (doc §0.3): every batch action in every tab
 * reads this, never a per-panel duplicate. Persists across tabs — state lives
 * in ThermalV2Shell and is passed down here.
 */
export function ScopePill({
  scope,
  selectedCount,
  totalCount,
  onChange,
}: {
  scope: ThermalV2Scope;
  selectedCount: number;
  totalCount: number;
  onChange: (kind: ThermalV2ScopeKind) => void;
}) {
  const options: { kind: ThermalV2ScopeKind; label: string; disabled?: boolean }[] = [
    { kind: "image", label: "This image" },
    { kind: "selected", label: `Selected (${selectedCount})`, disabled: selectedCount === 0 },
    { kind: "all", label: `All (${totalCount})` },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Scope — what the next action applies to"
      title="Choose what actions on this page apply to"
      className="inline-flex shrink-0 items-center rounded-md border border-[var(--mobile-app-card-border)] p-0.5 text-[11px]"
    >
      {options.map((opt) => {
        const active = scope.kind === opt.kind;
        return (
          <button
            key={opt.kind}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.kind)}
            className={`rounded px-2 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
