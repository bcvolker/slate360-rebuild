export type TwinPickPoint = { x: number; y: number; z: number };
export type CameraMode = "interior" | "orbit";
export type SplatViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
};

export const MOBILE_MAX_SPLATS = 80_000;
export const DESKTOP_MAX_SPLATS = 250_000;
export const LOOK_SENSITIVITY = 0.0022;
export const ZOOM_WHEEL_FACTOR = 1.05;
export const INTERIOR_MIN_ZOOM = 0.65;
export const INTERIOR_MAX_ZOOM = 1.75;
export const TAP_DRAG_THRESHOLD_PX = 8;
export const DOUBLE_TAP_MS = 320;
export const ORBIT_DAMPING = 0.06;
export const ORBIT_ROTATE_SPEED = 0.9;
export const ORBIT_ZOOM_SPEED = 0.85;
export const ORBIT_PAN_SPEED = 0.75;
export const VIEWER_DISCOVERY_HINT_MS = 5000;
