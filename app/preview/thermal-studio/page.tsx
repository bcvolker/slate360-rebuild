"use client";

import { useEffect, useState } from "react";
import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";

const CAPTURES: StudioCapture[] = [
  { id: "a", filename: "HM20000222005211.jpeg", metadata: { humidity_pct: 48, ambient_temp_c: 21, gps: { lat: 33.35, lon: -111.79 } }, qualityMetrics: { is_radiometric: true, avg_temp_c: 28 } },
  { id: "b", filename: "HM20000222005222.jpeg", metadata: { humidity_pct: 50 }, qualityMetrics: { is_radiometric: true } },
  { id: "c", filename: "HM20000222005231.jpeg", metadata: {}, qualityMetrics: { is_radiometric: true } },
];

export default function PreviewThermalStudio() {
  const [g, setG] = useState<ThermalProbeGrid | null>(null);
  useEffect(() => {
    fetch("/thermal-fixtures/sample-211.json").then((r) => r.json()).then(setG);
  }, []);

  return (
    <div className="h-[100dvh] p-4">
      <ThermalStudioWorkView captures={CAPTURES} loadGrid={async () => g} />
    </div>
  );
}
