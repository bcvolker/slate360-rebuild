import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

export const LAYER_ITEMS: { id: TwinLayerRepresentation; label: string }[] = [
  { id: "reality", label: "Reality" },
  { id: "geometry", label: "Geometry" },
];

export const VIEW_ITEMS: { id: ViewMode; label: string }[] = [
  { id: "dollhouse", label: "Dollhouse" },
  { id: "floorplan", label: "Plan" },
];

export const HYBRID_LABEL = "Reality + Geometry";

export function isInsideView(mode: ViewMode): boolean {
  return mode === "inside";
}
