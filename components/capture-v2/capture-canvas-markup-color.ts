import { fieldVisibility } from "@/lib/design-system/tokens";
import { readCaptureMarkupColor } from "./capture-canvas-markup-colors";

/** Default markup stroke color — brand green / --graphite-primary. */
export const CAPTURE_CANVAS_MARKUP_COLOR = fieldVisibility.siteWalkGreen;

/** Session-aware markup color for capture-v2 toolbar + canvas. */
export function getCaptureCanvasMarkupColor() {
  return readCaptureMarkupColor();
}
