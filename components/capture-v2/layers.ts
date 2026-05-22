/**
 * Capture V2 z-index layer contract — keep orchestrator stacking predictable.
 */
export const CAPTURE_V2_LAYERS = {
  canvas: "z-0",
  sceneMap: "z-10",
  filmstrip: "z-20",
  fastTrack: "z-20",
  drawer: "z-40",
  copilot: "z-[45]",
  taskHeader: "z-50",
  pipPreview: "z-50",
  modal: "z-[3000]",
} as const;

export const CAPTURE_V2_LAYER_IDS = {
  canvasBase: "capture-v2-canvas-base",
  filmstrip: "capture-v2-filmstrip",
  fastTrackBar: "capture-v2-fast-track-bar",
  logDrawer: "capture-v2-log-drawer",
} as const;

/** Shared Framer Motion layoutId for review photo PiP transitions. */
export const CAPTURE_V2_PIP_LAYOUT_ID = "capture-v2-review-photo";
