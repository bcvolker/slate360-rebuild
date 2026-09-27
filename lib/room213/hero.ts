import * as THREE from "three";
import { FLOOR_Y, OPEN_TOP_Y, ROOM } from "./scene-config";

export type CameraPose = { position: THREE.Vector3; target: THREE.Vector3; fov: number };

/** What the hero shot frames: the opened room (floor → Dollhouse cut), never the exterior margin or outliers. */
export const HERO_SUBJECT = new THREE.Box3(
  new THREE.Vector3(ROOM.min.x, FLOOR_Y, ROOM.min.z),
  new THREE.Vector3(ROOM.max.x, OPEN_TOP_Y, ROOM.max.z),
);

const corners = (box: THREE.Box3) => {
  const out: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
};

/**
 * Oblique hero pose: look at the subject's centre from `azimuthDeg` (around y, 0 = +z) and `elevationDeg`
 * above the horizon, backing off until every subject corner sits inside `fill` of the viewport (both axes).
 */
export function fitHeroPose(
  aspect: number,
  { azimuthDeg, elevationDeg, fov, fill }: { azimuthDeg: number; elevationDeg: number; fov: number; fill: number },
  subject: THREE.Box3 = HERO_SUBJECT,
): CameraPose {
  const target = subject.getCenter(new THREE.Vector3());
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.05, 500);
  const pts = corners(subject);
  const place = (d: number) => {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
  };
  const extents = () => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      const q = p.clone().project(cam);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    return { x0, x1, y0, y1 };
  };
  const fitDistance = () => {
    let lo = 0.5;
    let hi = 200;
    for (let i = 0; i < 40; i += 1) {
      const mid = (lo + hi) / 2;
      place(mid);
      const e = extents();
      if (Math.max(-e.x0, e.x1, -e.y0, e.y1) <= fill) hi = mid;
      else lo = mid;
    }
    place(hi);
    return hi;
  };
  // The projected box of an oblique view is lopsided (the near floor corner dominates). Re-aim at the projected
  // centre, then refit, so the room fills the frame evenly instead of backing off to satisfy one corner.
  let d = fitDistance();
  for (let i = 0; i < 4; i += 1) {
    const e = extents();
    const cx = (e.x0 + e.x1) / 2;
    const cy = (e.y0 + e.y1) / 2;
    const aim = new THREE.Vector3(cx, cy, new THREE.Vector3().copy(target).project(cam).z).unproject(cam);
    // keep the aim on the target's horizontal plane-ish: move the target by the screen-space offset only
    target.add(aim.sub(target));
    d = fitDistance();
  }
  const position = target.clone().addScaledVector(dir, d);
  // Same image, better pivot: slide the look-at point along the view ray to mid-room height, so Dollhouse orbit
  // pivots inside the room (the controls clamp their target into the room every frame).
  const midY = (subject.min.y + subject.max.y) / 2;
  const ray = target.clone().sub(position);
  const pivot = Math.abs(ray.y) > 1e-6 ? position.clone().addScaledVector(ray, (midY - position.y) / ray.y) : target;
  return { position, target: pivot, fov };
}

/** Per-form-factor hero compositions (tuned by eye against rendered frames; see docs/ops/room213-poc). */
export const HERO_PRESETS = {
  // From the door/whiteboard corner: the window wall (flag) and window end face the viewer; the walls nearest
  // the camera are plain, so they never show their exterior side or window fog in the foreground.
  landscape: { azimuthDeg: 45, elevationDeg: 38, fov: 45, fill: 0.92 },
  // Portrait looks more along the room's long (x) axis so the room fills the tall frame.
  portrait: { azimuthDeg: 62, elevationDeg: 46, fov: 50, fill: 0.94 },
} as const;

export function heroPoseFor(aspect: number): CameraPose {
  return fitHeroPose(aspect, aspect >= 1 ? HERO_PRESETS.landscape : HERO_PRESETS.portrait);
}
