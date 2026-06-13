"use client";

import { useEffect, useState } from "react";
import { ThermalProbeViewer, type ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";

export default function ThermalProbePreviewPage() {
  const [grid, setGrid] = useState<ThermalProbeGrid | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/thermal-fixtures/sample-211.json")
      .then((r) => r.json())
      .then(setGrid)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-lg font-bold text-[var(--graphite-text-header)]">
        Thermal probe preview — real HIKMICRO Pocket2 sample
      </h1>
      {err ? <p className="text-red-400">{err}</p> : null}
      {grid ? <ThermalProbeViewer grid={grid} title="HM20000222005211.jpeg" /> : <p>Loading…</p>}
    </div>
  );
}
