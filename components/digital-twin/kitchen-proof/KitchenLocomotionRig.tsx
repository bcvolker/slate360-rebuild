"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, type ReactElement } from "react";
import * as THREE from "three";

import type { KitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import {
  CAPSULE_RADIUS_M,
  KITCHEN_EYE_HEIGHT_WALK_M,
  clampWalkHeight,
  projectSlide,
  STEP_HEIGHT_M,
  walkDelta,
} from "@/lib/digital-twin/kitchen-capsule";
import type { WalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";

function navMeshes(scene: THREE.Scene): THREE.Object3D[] {
  const hits: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.userData?.twinNavMesh) hits.push(obj);
  });
  return hits;
}

export function KitchenLocomotionRig({
  loco,
  nav,
  fovRef,
  floorY,
  ceilingY,
  enabled,
}: {
  loco: KitchenLocomotion;
  nav: WalkthroughNavigation;
  fovRef: React.MutableRefObject<number>;
  floorY: number;
  ceilingY: number;
  enabled: boolean;
}): ReactElement | null {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const pose = loco.poseRef.current;
    if (enabled) {
      const keys = loco.keysRef.current;
      const step = Math.min(dt, 0.05);
      if (keys.f || keys.r) loco.targetRef.current = null;
      let [dx, dz] = walkDelta(keys.f, keys.r, pose.yaw, step);
      const target = loco.targetRef.current;
      if (!dx && !dz && target) {
        const tx = target.x - pose.x;
        const tz = target.z - pose.z;
        const span = Math.hypot(tx, tz);
        if (span < 0.12) loco.targetRef.current = null;
        else {
          const speed = 1.65 * step;
          const take = Math.min(speed, span);
          dx = (tx / span) * take;
          dz = (tz / span) * take;
        }
      }
      const meshes = navMeshes(scene);
      const tryMove = (mx: number, mz: number, extraY: number) => {
        dir.set(mx, 0, mz);
        const dist = dir.length();
        if (dist < 1e-6) return { mx, mz, blocked: false };
        dir.multiplyScalar(1 / dist);
        for (const h of [0.25, 0.85, 1.35]) {
          origin.set(pose.x, floorY + h + extraY, pose.z);
          raycaster.far = dist + CAPSULE_RADIUS_M;
          raycaster.set(origin, dir);
          const hit = raycaster.intersectObjects(meshes, false)[0];
          if (hit && hit.distance < dist + CAPSULE_RADIUS_M * 0.85) {
            const local = hit.face?.normal;
            const n = local
              ? local.clone().transformDirection(hit.object.matrixWorld)
              : new THREE.Vector3(-dir.x, 0, -dir.z);
            const [sx, sz] = projectSlide(mx, mz, n.x, n.z);
            return { mx: sx, mz: sz, blocked: Math.hypot(sx, sz) < dist * 0.05 };
          }
        }
        return { mx, mz, blocked: false };
      };
      if (meshes.length > 0 && (dx !== 0 || dz !== 0)) {
        let result = tryMove(dx, dz, 0);
        if (result.blocked) {
          const stepped = tryMove(dx, dz, STEP_HEIGHT_M);
          if (!stepped.blocked) result = stepped;
        }
        dx = result.mx;
        dz = result.mz;
      }
      pose.x += dx;
      pose.z += dz;
      origin.set(pose.x, pose.y, pose.z);
      raycaster.far = 2.4;
      raycaster.set(origin, down);
      const floorHit = raycaster.intersectObjects(meshes.length ? meshes : navMeshes(scene), false)[0];
      if (floorHit && floorHit.distance > 0.9 && floorHit.distance < 2.2) {
        pose.y = floorHit.point.y + KITCHEN_EYE_HEIGHT_WALK_M;
      } else {
        pose.y = floorY + KITCHEN_EYE_HEIGHT_WALK_M;
      }
      pose.y = clampWalkHeight(pose.y, floorY, ceilingY);
    }

    const live = enabled ? pose : {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      yaw: pose.yaw,
      pitch: pose.pitch,
    };
    if (!enabled) {
      nav.updateCamera(camera, dt);
    } else {
      camera.position.set(live.x, live.y, live.z);
      camera.rotation.set(live.pitch, live.yaw, 0, "YXZ");
    }
    const cam = camera as THREE.PerspectiveCamera;
    if ("fov" in cam && Math.abs(cam.fov - fovRef.current) > 0.05) {
      cam.fov = fovRef.current;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
