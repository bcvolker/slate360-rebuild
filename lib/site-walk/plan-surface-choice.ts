export type PlanSurfaceChoice = "pending" | "mobile-raster" | "mobile-processing" | "desktop-pdf";

/**
 * Mobile never mounts React-PDF. The viewport must be known first: a default
 * of "desktop" would paint the 1200px PDF canvas on a phone for one frame.
 * Desktop keeps the PDF viewer. Mobile uses the server raster, or a processing
 * state until that raster exists.
 */
export function choosePlanSurface(input: {
  viewportKnown: boolean;
  isPhone: boolean;
  hasRasterizedSheet: boolean;
}): PlanSurfaceChoice {
  if (!input.viewportKnown) return "pending";
  if (input.isPhone) return input.hasRasterizedSheet ? "mobile-raster" : "mobile-processing";
  return "desktop-pdf";
}
