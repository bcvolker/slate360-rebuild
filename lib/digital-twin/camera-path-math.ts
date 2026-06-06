import * as THREE from "three";
import type { CameraEasing, CameraKeyframe, TwinCameraPath } from "./camera-path-types";

export function applyEasing(t: number, easing: CameraEasing): number {
  const x = Math.min(1, Math.max(0, t));
  switch (easing) {
    case "easeIn":
      return x * x;
    case "easeOut":
      return 1 - (1 - x) * (1 - x);
    case "easeInOut":
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case "slowMo":
      return x < 0.5 ? 2 * x * x * 0.35 : 1 - Math.pow(-2 * x + 2, 2) / 2;
    default:
      return x;
  }
}

export function buildPositionCurve(keyframes: CameraKeyframe[]): THREE.CatmullRomCurve3 | null {
  if (keyframes.length < 2) return null;
  const points = keyframes.map(
    (kf) => new THREE.Vector3(kf.position[0], kf.position[1], kf.position[2]),
  );
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function buildLookAtCurve(keyframes: CameraKeyframe[]): THREE.CatmullRomCurve3 | null {
  if (keyframes.length < 2) return null;
  const points = keyframes.map(
    (kf) => new THREE.Vector3(kf.lookAt[0], kf.lookAt[1], kf.lookAt[2]),
  );
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function segmentDurations(path: TwinCameraPath): number[] {
  const { keyframes } = path;
  if (keyframes.length < 2) return [];
  const durations: number[] = [];
  for (let i = 0; i < keyframes.length - 1; i++) {
    durations.push(Math.max(200, keyframes[i].durationMs ?? 2000));
  }
  return durations;
}

export function samplePath(
  path: TwinCameraPath,
  elapsedMs: number,
): { position: THREE.Vector3; lookAt: THREE.Vector3; segmentIndex: number } | null {
  const { keyframes } = path;
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) {
    const kf = keyframes[0];
    return {
      position: new THREE.Vector3(...kf.position),
      lookAt: new THREE.Vector3(...kf.lookAt),
      segmentIndex: 0,
    };
  }

  const posCurve = buildPositionCurve(keyframes)!;
  const lookCurve = buildLookAtCurve(keyframes)!;
  const durations = segmentDurations(path);
  const total = durations.reduce((a, b) => a + b, 0);
  let tMs = elapsedMs % (path.loop ? total : total + 1);
  if (!path.loop && tMs >= total) tMs = total;

  let acc = 0;
  let seg = 0;
  for (let i = 0; i < durations.length; i++) {
    if (tMs <= acc + durations[i]) {
      seg = i;
      break;
    }
    acc += durations[i];
    seg = i;
  }

  const localT = (tMs - acc) / durations[seg];
  const eased = applyEasing(localT, keyframes[seg].easing);
  const u0 = seg / (keyframes.length - 1);
  const u1 = (seg + 1) / (keyframes.length - 1);
  const u = u0 + (u1 - u0) * eased;

  return {
    position: posCurve.getPoint(u),
    lookAt: lookCurve.getPoint(u),
    segmentIndex: seg,
  };
}
