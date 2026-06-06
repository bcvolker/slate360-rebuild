export type CameraEasing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "slowMo";

export type CameraKeyframe = {
  id: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  durationMs: number;
  easing: CameraEasing;
};

export type TwinCameraPath = {
  keyframes: CameraKeyframe[];
  loop?: boolean;
};

export function parseCameraPath(raw: unknown): TwinCameraPath {
  if (typeof raw !== "object" || raw === null) return { keyframes: [] };
  const obj = raw as TwinCameraPath;
  const keyframes = Array.isArray(obj.keyframes)
    ? obj.keyframes.filter(
        (kf) =>
          typeof kf?.id === "string" &&
          Array.isArray(kf.position) &&
          kf.position.length === 3 &&
          Array.isArray(kf.lookAt) &&
          kf.lookAt.length === 3,
      )
    : [];
  return { keyframes, loop: obj.loop === true };
}
