"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

/**
 * Apply one emissivity / reflected-temperature setting to many captures at once,
 * so a whole batch shares the same radiometric assumptions.
 */
export function ThermalBatchTunePanel({ captureIds }: { captureIds: string[] }) {
  const [emissivity, setEmissivity] = useState(0.95);
  const [reflected, setReflected] = useState(20);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function apply() {
    if (!captureIds.length) return;
    setBusy(true);
    setNotice(null);
    await Promise.all(
      captureIds.map((id) =>
        fetch(`/api/ops/thermal/captures/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tuning: { emissivity, reflected_c: reflected } }),
        }).catch(() => {}),
      ),
    );
    setBusy(false);
    setNotice(`Applied to ${captureIds.length} capture${captureIds.length === 1 ? "" : "s"}.`);
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Apply tune to all captures</p>
      <label className="mt-3 block text-xs text-[var(--graphite-muted)]">
        <span className="flex justify-between">
          <span>Emissivity</span>
          <span className="font-semibold tabular-nums text-[var(--graphite-text-body)]">{emissivity.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={emissivity}
          onChange={(e) => setEmissivity(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--graphite-primary)]"
        />
      </label>
      <label className="mt-2 block text-xs text-[var(--graphite-muted)]">
        Reflected temp (°C)
        <input
          type="number"
          value={reflected}
          onChange={(e) => setReflected(Number(e.target.value))}
          step={0.5}
          className="mt-1 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-sm text-[var(--graphite-text-body)]"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={busy || captureIds.length === 0} onClick={apply}>
          {busy ? "Applying…" : `Apply to ${captureIds.length}`}
        </button>
        {notice ? <span className="text-xs text-[var(--graphite-muted)]">{notice}</span> : null}
      </div>
    </div>
  );
}
