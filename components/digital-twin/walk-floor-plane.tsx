"use client";

/**
 * Invisible walk surface for splat-only twins.
 *
 * Click-to-walk raycasts objects tagged `userData.twinWalkSurface`; a LiDAR
 * mesh normally provides that. A Gaussian splat has no surface to hit, so this
 * lays a plane at the floor elevation, sized to the station footprint plus a
 * margin, and draws nothing. Stations remain the only places the camera rests.
 */

import { useMemo, type ReactElement } from "react";

import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

const MARGIN_M = 6;

export function WalkFloorPlane({
  stations,
  floors,
  floorIndex,
}: {
  stations: WalkStation[];
  floors: FloorInfo[];
  floorIndex: number;
}): ReactElement | null {
  const frame = useMemo(() => {
    const on = stations.filter((s) => s.floorIndex === floorIndex);
    if (on.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of on) {
      minX = Math.min(minX, s.position[0]);
      maxX = Math.max(maxX, s.position[0]);
      minZ = Math.min(minZ, s.position[2]);
      maxZ = Math.max(maxZ, s.position[2]);
    }
    const elevation =
      floors.find((f) => f.index === floorIndex)?.elevationY ??
      Math.min(...on.map((s) => s.position[1]));
    return {
      cx: (minX + maxX) / 2,
      cz: (minZ + maxZ) / 2,
      w: maxX - minX + MARGIN_M * 2,
      d: maxZ - minZ + MARGIN_M * 2,
      y: elevation,
    };
  }, [stations, floors, floorIndex]);

  if (!frame) return null;
  return (
    <mesh
      position={[frame.cx, frame.y, frame.cz]}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={{ twinWalkSurface: true }}
    >
      <planeGeometry args={[frame.w, frame.d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
