"use client";

import { ThermalStudioShell } from "@/components/ops/thermal/ThermalStudioShell";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

const CAPTURES: StudioCapture[] = [
  { id: "a", filename: "HM20000222005211.jpeg", qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2 (HM-TP42)", is_radiometric: true, avg_temp_c: 28, emissivity_used: 0.95 }, metadata: { humidity_pct: 48, ambient_temp_c: 21, gps: { lat: 33.35, lon: -111.79 } } },
  { id: "b", filename: "HM20000222005222.jpeg", qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2 (HM-TP42)", is_radiometric: true }, metadata: {} },
];

export default function PreviewThermalStudioShell() {
  return (
    <div className="h-[100dvh] p-4">
      <ThermalStudioShell
        sessionId="preview"
        sessionName="Oak Ridge Roof — Preview"
        captures={CAPTURES}
        initialJob={null}
        brandingConfig={{} as never}
        initialParams={undefined}
        linkedSpaceId={null}
      />
    </div>
  );
}
