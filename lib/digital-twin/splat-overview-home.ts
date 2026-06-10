import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import {
  applyExteriorCameraFrame,
  computeExteriorOverviewFrame,
  type ExteriorCameraFrame,
} from "@/lib/digital-twin/exterior-camera-frame";
import { orbitDistanceLimitsFromHome } from "@/lib/digital-twin/splat-orbit-guard";
import { getSplatSceneBounds } from "@/lib/digital-twin/splat-camera-frame";
import { buildSplatBoundsReport } from "@/lib/digital-twin/splat-bounds";

export type OverviewHomeFrame = ExteriorCameraFrame & {
  bounds: THREE.Box3;
  homeDistance: number;
  minDistance: number;
  maxDistance: number;
};

/** Single overview framing entry for share, auth, and embed viewers. */
export function computeOverviewHomeFrame(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
): OverviewHomeFrame {
  mesh.updateMatrixWorld(true);
  const bounds = getSplatSceneBounds(mesh);
  const frame = computeExteriorOverviewFrame(bounds, camera);
  const homeDistance = frame.position.distanceTo(frame.target);
  const limits = orbitDistanceLimitsFromHome(homeDistance);
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
  options?: { logLabel?: string },
): OverviewHomeFrame {
  camera.updateProjectionMatrix();
  const home = computeOverviewHomeFrame(mesh, camera);
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
