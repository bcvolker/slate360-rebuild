import { PlanWalkCanvas } from "@/components/external-portal/PlanWalkCanvas";
import { buildDirectedWalkOverlay } from "@/lib/spatial-walkthrough/directed-walk-plan";

const SHEET = "preview-sheet";

function drawingUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560"><rect width="800" height="560" fill="#f5f5f4"/><rect x="80" y="70" width="640" height="420" fill="none" stroke="#44403c" stroke-width="3"/><text x="400" y="40" text-anchor="middle" fill="#44403c" font-family="sans-serif" font-size="18">Level 1</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Harness for the portal plan overlay. Reference points place a short walk on the sheet. */
export default function PortalPlanWalkPreview() {
  const anchors = [
    { pathX: 0, pathY: 0, planU: 0.2, planV: 0.75 },
    { pathX: 10, pathY: 0, planU: 0.8, planV: 0.75 },
    { pathX: 0, pathY: 10, planU: 0.2, planV: 0.25 },
  ];
  const overlay = buildDirectedWalkOverlay({
    anchors,
    accuracyHint: "georef",
    path: [
      { id: "a", t: 0, x: 0, y: 0, label: "Entry", clipId: "clip" },
      { id: "b", t: 12, x: 5, y: 0, label: "Aisle", clipId: "clip" },
      { id: "c", t: 24, x: 10, y: 0, label: "East wall", clipId: "clip" },
      { id: "d", t: 36, x: 10, y: 8, label: "North wall", clipId: "clip" },
    ],
  });
  return (
    <div className="min-h-[100dvh] bg-[var(--portal-canvas)] px-4 py-6">
      <PlanWalkCanvas
        token="preview"
        sheets={[{ id: SHEET, sheetNumber: "A1", title: "Level 1", imageUrl: drawingUrl(), width: 800, height: 560 }]}
        overlays={{ [SHEET]: overlay }}
      />
    </div>
  );
}
