/**
 * Deliverable branding — overlay transform math (pure, viewport-independent).
 * The same normalized transform drives the web viewer, the twin splat viewer, and the PDF bake.
 * Design: docs/design/DELIVERABLE_BRANDING_LOCKED.md.
 */
import { OVERLAY_LIMITS, type LogoOverlayTransform } from "./overlay-types";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Clamp a transform to the tier-safe limits (also used server-side before persisting). */
export function clampTransform(t: LogoOverlayTransform): LogoOverlayTransform {
  return {
    x: clamp(t.x, OVERLAY_LIMITS.posMin, OVERLAY_LIMITS.posMax),
    y: clamp(t.y, OVERLAY_LIMITS.posMin, OVERLAY_LIMITS.posMax),
    scale: clamp(t.scale, OVERLAY_LIMITS.scaleMin, OVERLAY_LIMITS.scaleMax),
    opacity: clamp(t.opacity, OVERLAY_LIMITS.opacityMin, OVERLAY_LIMITS.opacityMax),
  };
}

export interface OverlayPixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
}

/**
 * Resolve a normalized transform to a pixel rect on a canvas of size (canvasW, canvasH).
 * x/y are the logo CENTER; the returned left/top are the top-left corner. Works identically for
 * a DOM canvas or a PDF page (pass the page's point dimensions).
 */
export function overlayToPixels(
  t: LogoOverlayTransform,
  canvasW: number,
  canvasH: number,
  logoAspect = 3, // width/height; wordmarks default ~3:1
): OverlayPixelRect {
  const width = clamp(t.scale, OVERLAY_LIMITS.scaleMin, OVERLAY_LIMITS.scaleMax) * canvasW;
  const height = width / (logoAspect || 1);
  const centerX = t.x * canvasW;
  const centerY = t.y * canvasH;
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    opacity: clamp(t.opacity, OVERLAY_LIMITS.opacityMin, OVERLAY_LIMITS.opacityMax),
  };
}

/**
 * Inverse: an editor's pixel rect (from a drag/resize on a preview of size canvasW×canvasH) back to
 * a normalized transform. Feed this from react-rnd's onDragStop / onResizeStop.
 */
export function pixelsToOverlay(
  rect: { left: number; top: number; width: number; opacity: number },
  canvasW: number,
  canvasH: number,
  logoAspect = 3,
): LogoOverlayTransform {
  const height = rect.width / (logoAspect || 1);
  return clampTransform({
    x: (rect.left + rect.width / 2) / canvasW,
    y: (rect.top + height / 2) / canvasH,
    scale: rect.width / canvasW,
    opacity: rect.opacity,
  });
}

/** For PDF libraries whose origin is bottom-left (pdf-lib): flip the Y of a top-left rect. */
export function flipYForPdf(rect: OverlayPixelRect, pageHeight: number): OverlayPixelRect {
  return { ...rect, top: pageHeight - rect.top - rect.height };
}
