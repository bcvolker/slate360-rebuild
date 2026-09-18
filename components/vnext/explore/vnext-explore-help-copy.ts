import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

/** Short, representation-aware help — one or two sentences, not a manual. */
export const VNEXT_EXPLORE_HELP: Record<VnextExploreRepresentation, string> = {
  reality: "Drag to orbit, scroll to zoom. This is the captured space itself — a photo-real 3D reconstruction.",
  geometry: "Drag to orbit, scroll to zoom. This is the modeled geometry of the space.",
  "360": "Drag to look around, scroll to zoom. This is a single 360° photo from the site.",
  plan: "Drag to pan, scroll or use the buttons to zoom. This is the plan sheet as captured.",
  thermal: "Use Prev/Next or the thumbnails to browse thermal images from this inspection.",
};
