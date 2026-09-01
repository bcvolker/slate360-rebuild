"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, type ReactElement } from "react";
import * as THREE from "three";

import { cssColor, TWIN_ACCENT_FALLBACK } from "@/lib/digital-twin/css-color";
import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";
import type { Vec3 } from "@/lib/digital-twin/s360-world";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";

export type MetricHit = {
  point: Vec3;
  normal: Vec3 | null;
  faceIndex: number | null;
};

function toVec3(v: THREE.Vector3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function StationMarkers({
  stations,
  floors,
  floorIndex,
  currentId,
  visible,
}: {
  stations: WalkStation[];
  floors: FloorInfo[];
  floorIndex: number;
  currentId: string | null;
  visible: boolean;
}): ReactElement | null {
  if (!visible) return null;
  const elevation = floors.find((f) => f.index === floorIndex)?.elevationY ?? 0;
  return (
    <group>
      {stations
        .filter((s) => s.floorIndex === floorIndex)
        .map((s) => (
          <mesh
            key={s.id}
            position={[s.position[0], elevation + 0.03, s.position[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[s.id === currentId ? 0.22 : 0.16, 24]} />
            <meshBasicMaterial
              color={
                s.id === currentId
                  ? cssColor("--twin360-blue", TWIN_ACCENT_FALLBACK)
                  : cssColor("--foreground", { h: 0, s: 0, l: 1 })
              }
              transparent
              opacity={s.id === currentId ? 0.95 : 0.45}
            />
          </mesh>
        ))}
    </group>
  );
}

export function NavigationRig({
  nav,
  fovRef,
  driveCamera = true,
  onFloorHit,
  onMetricHit,
}: {
  nav: ReturnType<typeof useWalkthroughNavigation>;
  fovRef: React.MutableRefObject<number>;
  driveCamera?: boolean;
  onFloorHit: (fn: (x: number, y: number) => [number, number, number] | null) => void;
  onMetricHit: (fn: (x: number, y: number) => MetricHit | null) => void;
}): null {
  const { camera, scene, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const pick = useCallback(
    (screenX: number, screenY: number, kind: "walk" | "metric") => {
      const ndc = new THREE.Vector2(
        (screenX / size.width) * 2 - 1,
        -(screenY / size.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (kind === "metric") {
        return (
          hits.find((h) => Boolean(h.object.userData?.twinMeasureMesh)) ??
          hits.find((h) => Boolean(h.object.userData?.twinWalkSurface)) ??
          null
        );
      }
      return (
        hits.find((h) => Boolean(h.object.userData?.twinNavMesh)) ??
        hits.find((h) => Boolean(h.object.userData?.twinWalkSurface)) ??
        null
      );
    },
    [camera, raycaster, scene, size.height, size.width],
  );

  const raycastFloor = useCallback(
    (screenX: number, screenY: number): [number, number, number] | null => {
      const hit = pick(screenX, screenY, "walk");
      if (!hit) return null;
      return [hit.point.x, hit.point.y, hit.point.z];
    },
    [pick],
  );

  const raycastMetric = useCallback(
    (screenX: number, screenY: number): MetricHit | null => {
      const hit = pick(screenX, screenY, "metric");
      if (!hit) return null;
      const n = hit.face?.normal
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : hit.normal
          ? hit.normal.clone().normalize()
          : null;
      return {
        point: toVec3(hit.point),
        normal: n ? toVec3(n) : null,
        faceIndex: typeof hit.faceIndex === "number" ? hit.faceIndex : null,
      };
    },
    [pick],
  );

  onFloorHit(raycastFloor);
  onMetricHit(raycastMetric);
  useFrame((_, delta) => {
    if (driveCamera) nav.updateCamera(camera, delta);
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera && perspective.fov !== fovRef.current) {
      perspective.fov = fovRef.current;
      perspective.updateProjectionMatrix();
    }
  });
  return null;
}
