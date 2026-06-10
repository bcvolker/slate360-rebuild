import { brand, fieldVisibility } from "@/lib/design-system/tokens";

export const CAPTURE_V2_MARKUP_COLOR_SESSION_KEY = "capture-v2-markup-color";

export type CaptureCanvasMarkupColorId = "white" | "green" | "blue" | "red" | "black";

export const CAPTURE_CANVAS_MARKUP_COLORS: ReadonlyArray<{
  id: CaptureCanvasMarkupColorId;
  label: string;
  value: string;
}> = [
  { id: "white", label: "White", value: brand.white },
  { id: "green", label: "Brand green", value: fieldVisibility.siteWalkGreen },
  { id: "blue", label: "Brand blue", value: fieldVisibility.twin360Blue },
  { id: "red", label: "Red", value: "var(--destructive)" },
  { id: "black", label: "Black", value: fieldVisibility.canvasDark },
] as const;

export function readCaptureMarkupColor(): string {
  if (typeof window === "undefined") return fieldVisibility.siteWalkGreen;
  const stored = window.sessionStorage.getItem(CAPTURE_V2_MARKUP_COLOR_SESSION_KEY);
  if (stored && CAPTURE_CANVAS_MARKUP_COLORS.some((entry) => entry.value === stored)) return stored;
  return fieldVisibility.siteWalkGreen;
}

export function writeCaptureMarkupColor(color: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CAPTURE_V2_MARKUP_COLOR_SESSION_KEY, color);
}
