"use client";

import { ThermalShareViewer } from "@/components/share/thermal/ThermalShareViewer";

const IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='192'><rect width='256' height='192' fill='#1b2a3a'/><rect x='120' y='80' width='40' height='30' fill='#d8552f'/></svg>`,
  );

const DATA = {
  sessionId: "preview",
  sessionName: "Oak Ridge Roof — Stakeholder Preview",
  role: "view",
  linkedSpaceId: null,
  branding: { company_name: "Slate360 Thermal", show_metrics: true, custom_footer: "" } as never,
  summaryMetrics: { total_captures: 2, max_detected_temp_c: 62.1, critical_anomalies: 1 },
  captures: [
    {
      id: "a",
      filename: "HM20000222005211.jpeg",
      previewUrl: IMG,
      qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2", max_temp_c: 62.1, min_temp_c: 18.3, avg_temp_c: 28, emissivity_used: 0.95 },
      anomalies: [
        { id: "x1", type: "hot_spot", severity: "action", temp_c: 62.1, delta_c: 14.2, background_c: 24.0, pattern: "focal", bbox: { x: 120, y: 80, w: 40, h: 30 } },
      ],
      gpsPosition: { lat: 33.35, lon: -111.79 },
    },
    {
      id: "b",
      filename: "HM20000222005222.jpeg",
      previewUrl: IMG,
      qualityMetrics: { sensor_make: "HIKMICRO", sensor_model: "Pocket2", max_temp_c: 30, min_temp_c: 19 },
      anomalies: [],
      gpsPosition: {},
    },
  ],
};

export default function PreviewThermalShare() {
  return <ThermalShareViewer data={DATA as never} token={undefined} />;
}
