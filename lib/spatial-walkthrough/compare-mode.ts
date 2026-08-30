export const COMPARE_MODES = ["split", "swipe", "overlay", "flip", "stack"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

export const COMPARE_MODE_LABEL: Record<CompareMode, string> = {
  split: "Split",
  swipe: "Swipe",
  overlay: "Overlay",
  flip: "Flip",
  stack: "Top / Bottom",
};

export function mobileModes(overlayEnabled: boolean): CompareMode[] {
  return overlayEnabled ? ["flip", "swipe", "stack", "overlay"] : ["flip", "swipe", "stack"];
}

export function desktopModes(overlayEnabled: boolean): CompareMode[] {
  return overlayEnabled ? ["split", "swipe", "overlay", "flip"] : ["split", "swipe", "flip"];
}

export function defaultMode(compact: boolean, _overlayEnabled = false): CompareMode {
  if (compact) return "flip";
  return "split";
}
