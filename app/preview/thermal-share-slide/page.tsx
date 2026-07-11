"use client";

import { ThermalShareSlide } from "@/components/share/thermal/ThermalShareSlide";

/**
 * S7.5 Radiometric Live Link — isolated preview harness. The real
 * /share/thermal/[token] page resolves its token server-side (RSC), which
 * can't be intercepted by Playwright's page.route; this harness renders the
 * SAME client component directly so the hover-temperature feature (the
 * flagship deliverable) is still e2e-testable with a mocked grid fetch.
 */
export default function PreviewThermalShareSlide() {
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] p-6">
      <ThermalShareSlide
        token="preview-token"
        capture={{
          id: "a",
          filename: "roof-nw-01.jpeg",
          previewUrl: "/window.svg",
          anomalies: [{ id: "an-1", type: "hot_spot", severity: "action", temp_c: 42, delta_c: 14, bbox: { x: 80, y: 60, w: 60, h: 40 } }],
          qualityMetrics: { sensor_model: "HIKMICRO Pocket2" },
        }}
      />
    </div>
  );
}
