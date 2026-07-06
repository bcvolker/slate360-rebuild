import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import {
  applyExteriorCameraFrame,
  computeExteriorOverviewFrame,
  type ExteriorCameraFrame,
} from "@/lib/digital-twin/exterior-camera-frame";
import { orbitDistanceLimitsFromRadius } from "@/lib/digital-twin/splat-orbit-guard";
import { getSplatSceneBounds } from "@/lib/digital-twin/splat-camera-frame";
import { buildSplatBoundsReport } from "@/lib/digital-twin/splat-bounds";
import { raycastSplatMeshFromRay } from "@/lib/digital-twin/splat-raycast";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";

/** R8.2: when the initial_camera's view direction doesn't hit any splat mass
 * (raycast miss), pivot on a point this far ahead instead. */
const INITIAL_CAMERA_PIVOT_FALLBACK_DISTANCE = 2.5;

export type OverviewHomeFrame = ExteriorCameraFrame & {
  bounds: THREE.Box3;
  homeDistance: number;
  minDistance: number;
  maxDistance: number;
};

/** Box3 from the manifest's core bounds — already in the viewer's post-flip
 * space (coordinate_system: "three_y_up_post_pi_flip"), so no conversion. */
function boundsFromManifest(manifest: SplatManifest): THREE.Box3 | null {
  const min = manifest.bounds?.min;
  const max = manifest.bounds?.max;
  if (!min || min.length < 3 || !max || max.length < 3) return null;
  return new THREE.Box3(
    new THREE.Vector3(min[0], min[1], min[2]),
    new THREE.Vector3(max[0], max[1], max[2]),
  );
}

/** ExteriorCameraFrame from the manifest's baked fallback_camera (R8.1's name
 * for AF11's original recommended_orbit_camera — read the new name first,
 * falling back to the old one for models baked before this deploy). */
function frameFromManifest(manifest: SplatManifest): ExteriorCameraFrame | null {
  const cam = manifest.fallback_camera ?? manifest.recommended_orbit_camera;
  const position = cam?.position;
  const target = cam?.target;
  if (!position || position.length < 3 || !target || target.length < 3) return null;
  return {
    position: new THREE.Vector3(position[0], position[1], position[2]),
    target: new THREE.Vector3(target[0], target[1], target[2]),
  };
}

const TMP_INITIAL_FORWARD = new THREE.Vector3();
const TMP_INITIAL_QUAT = new THREE.Quaternion();

/**
 * R8.1/R8.2: ExteriorCameraFrame from the manifest's baked initial_camera — a
 * real capture pose, preferred over the synthetic fallback_camera whenever
 * present. The orbit pivot is a point along the camera's own view direction:
 * raycast against the actual mesh for the nearest splat mass, or
 * INITIAL_CAMERA_PIVOT_FALLBACK_DISTANCE ahead when the ray misses (an empty
 * doorway view, floor-only view, etc.).
 */
function frameFromInitialCamera(manifest: SplatManifest, mesh: SplatMesh): ExteriorCameraFrame | null {
  const cam = manifest.initial_camera;
  if (!cam || !cam.position || cam.position.length < 3 || !cam.rotation || cam.rotation.length < 4) {
    return null;
  }
  const position = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
  TMP_INITIAL_QUAT.set(cam.rotation[0], cam.rotation[1], cam.rotation[2], cam.rotation[3]);
  TMP_INITIAL_FORWARD.set(0, 0, -1).applyQuaternion(TMP_INITIAL_QUAT).normalize();

  const hit = raycastSplatMeshFromRay(mesh, position, TMP_INITIAL_FORWARD);
  const target = hit
    ? hit.point.clone()
    : position.clone().addScaledVector(TMP_INITIAL_FORWARD, INITIAL_CAMERA_PIVOT_FALLBACK_DISTANCE);

  return { position, target };
}

const TMP_RADIUS_SIZE = new THREE.Vector3();

/** V1: the model's core radius — manifest's baked value when available
 * (matches the server's percentile-clip computation exactly), else half the
 * largest bounds dimension as a reasonable fallback for older models. */
function resolveCoreRadius(manifest: SplatManifest | null | undefined, bounds: THREE.Box3): number {
  const manifestRadius = manifest?.bounds?.radius;
  if (typeof manifestRadius === "number" && manifestRadius > 0) return manifestRadius;
  bounds.getSize(TMP_RADIUS_SIZE);
  return Math.max(TMP_RADIUS_SIZE.x, TMP_RADIUS_SIZE.y, TMP_RADIUS_SIZE.z, 1.0) / 2;
}

/**
 * AF11/R8.2: single overview framing entry for share, auth, and embed viewers.
 *
 * Precedence: (1) initial_camera — a real capture pose (R8.1) — whenever the
 * manifest has one; (2) fallback_camera/recommended_orbit_camera — the
 * worker-baked synthetic orbit camera, computed server-side on the
 * AF9-cropped/recentered point cloud so it's authoritative; (3) client-side
 * percentile-trimmed mesh bounds (getSplatSceneBounds) — pure last resort, no
 * manifest at all (fetch failure) or an ancient pre-AF11 model. R8.2 kills
 * bounds-based opening framing as anything but that last resort.
 */
export function computeOverviewHomeFrame(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  manifest?: SplatManifest | null,
): OverviewHomeFrame {
  mesh.updateMatrixWorld(true);
  const manifestBounds = manifest ? boundsFromManifest(manifest) : null;
  const bounds = manifestBounds ?? getSplatSceneBounds(mesh);
  const initialFrame = manifest ? frameFromInitialCamera(manifest, mesh) : null;
  const manifestFrame = manifest ? frameFromManifest(manifest) : null;
  const frame = initialFrame ?? manifestFrame ?? computeExteriorOverviewFrame(bounds, camera);
  const homeDistance = frame.position.distanceTo(frame.target);
  const radius = resolveCoreRadius(manifest, bounds);
  const limits = orbitDistanceLimitsFromRadius(radius);
  return {
    ...frame,
    bounds: bounds.clone(),
    homeDistance,
    minDistance: limits.minDistance,
    maxDistance: limits.maxDistance,
  };
}

export function applyOverviewHomeFrame(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  controls: {
    target: THREE.Vector3;
    minDistance?: number;
    maxDistance?: number;
    update: () => void;
  } | null,
  options?: { logLabel?: string; manifest?: SplatManifest | null },
): OverviewHomeFrame {
  camera.updateProjectionMatrix();
  const home = computeOverviewHomeFrame(mesh, camera, options?.manifest);
  applyExteriorCameraFrame(camera, controls, home);
  if (controls) {
    controls.minDistance = home.minDistance;
    controls.maxDistance = home.maxDistance;
    controls.update();
  }
  if (options?.logLabel) {
    const report = buildSplatBoundsReport(mesh);
    console.info(`[${options.logLabel}] overview home frame`, {
      raw: report.raw,
      trimmed: report.trimmed,
      homeDistance: home.homeDistance,
      camera: [camera.position.x, camera.position.y, camera.position.z],
      target: [home.target.x, home.target.y, home.target.z],
      aspect: camera.aspect,
    });
  }
  return home;
}
