import type L from "leaflet";
import { planCropBoundsExpression, readSheetCropBboxPct } from "@/lib/site-walk/plan-crop-bbox";
import type { SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CapturePlanFitPadding } from "@/lib/site-walk/capture-plan-canvas-tokens";

export function resolvePlanLeafletBounds(
  sheet: Pick<SiteWalkPlanSheet, "metadata"> | null | undefined,
  imageWidth: number,
  imageHeight: number,
): L.LatLngBoundsExpression {
  const crop = readSheetCropBboxPct(sheet);
  return planCropBoundsExpression(imageWidth, imageHeight, crop);
}

export function fitPlanLeafletMap(
  map: L.Map,
  sheet: Pick<SiteWalkPlanSheet, "metadata"> | null | undefined,
  imageWidth: number,
  imageHeight: number,
  padding: CapturePlanFitPadding,
) {
  const bounds = resolvePlanLeafletBounds(sheet, imageWidth, imageHeight);
  map.fitBounds(bounds, {
    paddingTopLeft: [padding.left, padding.top],
    paddingBottomRight: [padding.right, padding.bottom],
    animate: false,
  });
}
