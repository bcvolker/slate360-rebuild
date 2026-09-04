/** Future Twin Guided Tour. Separate from Spatial Walkthrough Play. */

export type GuidedKeyframe = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  durationMs: number;
  easing: "linear" | "easeInOut";
};

export type GuidedTwinTour = {
  id: string;
  modelId: string;
  title: string;
  keyframes: GuidedKeyframe[];
};

export function emptyGuidedTour(modelId: string): GuidedTwinTour {
  return { id: "", modelId, title: "", keyframes: [] };
}
