"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  isRegisteredCamera,
  type TwinCameraPose,
} from "@/lib/digital-twin/twin-cameras";

const FRUSTUM_LEN = 0.55;
const FRUSTUM_HALF = 0.18;
const _color = new THREE.Color();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3(1, 1, 1);

/** Thin pyramid frustum pointing down local -Z (camera look). */
function buildFrustumGeometry(): THREE.BufferGeometry {
  const tip = new THREE.Vector3(0, 0, 0);
  const z = -FRUSTUM_LEN;
  const h = FRUSTUM_HALF;
  const corners = [
    new THREE.Vector3(-h, -h, z),
    new THREE.Vector3(h, -h, z),
    new THREE.Vector3(h, h, z),
    new THREE.Vector3(-h, h, z),
  ];
  const positions: number[] = [];
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  pushTri(tip, corners[0], corners[1]);
  pushTri(tip, corners[1], corners[2]);
  pushTri(tip, corners[2], corners[3]);
  pushTri(tip, corners[3], corners[0]);
  pushTri(corners[0], corners[2], corners[1]);
  pushTri(corners[0], corners[3], corners[2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function PhotoExplorerMarkers({
  cameras,
  visible,
  selectedIndex,
  onHover,
  onSelect,
  correctionQuaternion,
}: {
  cameras: TwinCameraPose[];
  visible: boolean;
  selectedIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  /** The splat manifest rotates the model's parent group; markers need the same correction. */
  correctionQuaternion?: number[] | null;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const { gl } = useThree();

  const registered = useMemo(
    () =>
      cameras
        .map((cam, index) => ({ cam, index }))
        .filter(({ cam }) => isRegisteredCamera(cam)),
    [cameras],
  );

  const geometry = useMemo(() => buildFrustumGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
        vertexColors: true,
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const correction =
      correctionQuaternion && correctionQuaternion.length >= 4
        ? new THREE.Quaternion(
            correctionQuaternion[0],
            correctionQuaternion[1],
            correctionQuaternion[2],
            correctionQuaternion[3],
          ).normalize()
        : null;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--twin360-blue").trim() || "white";
    registered.forEach(({ cam }, instanceId) => {
      const p = cam.position!;
      const r = cam.rotation!;
      _pos.set(p[0], p[1], p[2]);
      _quat.set(r[0], r[1], r[2], r[3]).normalize();
      // Camera looks down -Z in its local frame; quaternion is camera-to-world.
      if (correction) {
        _pos.applyQuaternion(correction);
        _quat.premultiply(correction);
      }
      _matrix.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(instanceId, _matrix);
      _color.set(accent);
      mesh.setColorAt(instanceId, _color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = registered.length;
  }, [correctionQuaternion, registered]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.instanceColor) return;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--twin360-blue").trim() || "white";
    registered.forEach(({ index: sourceIndex }, instanceId) => {
      const isHot = hovered === sourceIndex || selectedIndex === sourceIndex;
      _color.set(isHot ? "white" : accent);
      mesh.setColorAt(instanceId, _color);
    });
    mesh.instanceColor.needsUpdate = true;
  }, [hovered, registered, selectedIndex]);

  if (!visible || registered.length === 0) return null;

  const instanceToSource = (instanceId: number) => registered[instanceId]?.index ?? null;

  const pickInstance = (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const id = event.instanceId;
    if (id == null) return null;
    return instanceToSource(id);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, Math.max(registered.length, 1)]}
      frustumCulled={false}
      onPointerMove={(e) => {
        const sourceIndex = pickInstance(e);
        if (sourceIndex == null) return;
        setHovered(sourceIndex);
        onHover(sourceIndex);
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(null);
        onHover(null);
        gl.domElement.style.cursor = "";
      }}
      onClick={(e) => {
        const sourceIndex = pickInstance(e);
        if (sourceIndex != null) onSelect(sourceIndex);
      }}
    />
  );
}
