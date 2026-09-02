"use client";

import { useMemo, type ReactElement } from "react";
import * as THREE from "three";

import { cssColor, MESH_SURFACE_FALLBACK } from "@/lib/digital-twin/css-color";

export function KitchenMeshLayer({
  geometry,
  opacity = 1,
  visible = true,
  collisionOnly = false,
  wireframe = false,
  role,
}: {
  geometry: THREE.BufferGeometry;
  opacity?: number;
  visible?: boolean;
  collisionOnly?: boolean;
  wireframe?: boolean;
  role: "display" | "nav" | "measure";
}): ReactElement {
  const material = useMemo(() => {
    const hasColor = Boolean(geometry.getAttribute("color"));
    const mat = new THREE.MeshLambertMaterial({
      color: hasColor ? new THREE.Color(1, 1, 1) : cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
      vertexColors: hasColor && !wireframe,
      side: role === "nav" ? THREE.DoubleSide : THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      transparent: opacity < 0.99 || wireframe,
      opacity,
      wireframe,
      depthWrite: opacity > 0.95 && !collisionOnly && !wireframe,
      colorWrite: !collisionOnly,
    });
    return mat;
  }, [geometry, opacity, collisionOnly, wireframe]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      visible={visible}
      frustumCulled={false}
      userData={{
        twinWalkSurface: role === "nav" || role === "display",
        twinNavMesh: role === "nav",
        twinMeasureMesh: role === "measure",
      }}
    />
  );
}
