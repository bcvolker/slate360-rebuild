import { PLAN_PIN_MARKER } from "@/lib/capture-v2/plan-pin-marker-tokens";
import { devPlanPinStoreCount } from "./dev-plan-pin-store";

export type PlanPinPlacementSample = {
  markerCount: number;
  deltaPx: number | null;
  tolerancePx: number;
  pass: boolean;
};

export type PlanPinRapidDropSample = {
  apiPinCount: number;
  markerCount: number;
  clientPinIds: string[];
  pass: boolean;
};

export function measurePlanPinPlacement(
  pressX: number,
  pressY: number,
): PlanPinPlacementSample | null {
  const markers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-plan-pin-marker="session"]'),
  );
  if (markers.length === 0) return null;
  const marker = markers[markers.length - 1]!;
  const rect = marker.getBoundingClientRect();
  const anchorX = rect.left + rect.width / 2;
  const anchorY = rect.bottom;
  const deltaPx = Math.hypot(anchorX - pressX, anchorY - pressY);
  const tolerancePx = PLAN_PIN_MARKER.placementTolerancePx;
  return {
    markerCount: markers.length,
    deltaPx: Math.round(deltaPx * 10) / 10,
    tolerancePx,
    pass: deltaPx <= tolerancePx,
  };
}

export function measurePlanPinRapidDrop(planSheetId: string): PlanPinRapidDropSample {
  const markers = document.querySelectorAll('[data-plan-pin-marker="session"]');
  const clientPinIds = Array.from(markers)
    .map((node) => node.getAttribute("data-plan-pin-label") ?? "")
    .filter(Boolean);
  const apiPinCount = devPlanPinStoreCount(planSheetId);
  const markerCount = markers.length;
  const pass = apiPinCount === 5 && markerCount === 5;
  return { apiPinCount, markerCount, clientPinIds, pass };
}
