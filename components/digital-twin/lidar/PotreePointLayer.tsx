"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LidarColorMode, LidarManifest } from "@/lib/digital-twin/lidar-contract";
import {
  selectPotreeNodes,
  useLidarTiles,
  type LidarPointData,
} from "./useLidarTiles";

type Props = {
  baseUrl: string;
  modelId?: string | null;
  manifest: LidarManifest;
  mode: LidarColorMode;
  pointSize: number;
  onPointsChange: (points: LidarPointData | null) => void;
  onStatus: (loading: boolean, error: string | null) => void;
  onPoint: (point: THREE.Vector3) => void;
  sectionMode: boolean;
  onSectionStart: (point: THREE.Vector3) => void;
  onSectionEnd: (point: THREE.Vector3) => void;
  regionMode: boolean;
  onRegionStart: (point: THREE.Vector3) => void;
  onRegionEnd: (point: THREE.Vector3) => void;
};

function LidarPoints({
  points,
  mode,
  pointSize,
  onPoint,
  sectionMode,
  onSectionStart,
  onSectionEnd,
  regionMode,
  onRegionStart,
  onRegionEnd,
}: Omit<Props, "baseUrl" | "modelId" | "manifest" | "onPointsChange" | "onStatus"> & {
  points: LidarPointData;
}) {
  const colors = useMemo(() => {
    const output = new Float32Array(points.colors.length);
    const values = mode === "deviation" ? points.deviations : points.slopes;
    let min = values.length ? values[0] : 0;
    let max = values.length ? values[0] : 1;
    for (let index = 1; index < values.length; index += 1) {
      min = Math.min(min, values[index]);
      max = Math.max(max, values[index]);
    }
    const span = Math.max(max - min, 1e-6);
    for (let index = 0; index < values.length; index += 1) {
      if (mode === "rgb") {
        output[index * 3] = points.colors[index * 3] / 255;
        output[index * 3 + 1] = points.colors[index * 3 + 1] / 255;
        output[index * 3 + 2] = points.colors[index * 3 + 2] / 255;
      } else {
        const color = new THREE.Color().setHSL(
          0.66 - ((values[index] - min) / span) * 0.66,
          0.9,
          0.55,
        );
        output[index * 3] = color.r;
        output[index * 3 + 1] = color.g;
        output[index * 3 + 2] = color.b;
      }
    }
    return output;
  }, [mode, points.colors, points.deviations, points.slopes]);

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(points.positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return next;
  }, [colors, points.positions]);

  return (
    <points
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation();
        if (!sectionMode && !regionMode) onPoint(event.point.clone());
      }}
      onPointerDown={(event) => {
        if (!sectionMode && !regionMode) return;
        event.stopPropagation();
        if (sectionMode) onSectionStart(event.point.clone());
        else onRegionStart(event.point.clone());
      }}
      onPointerUp={(event) => {
        if (!sectionMode && !regionMode) return;
        event.stopPropagation();
        if (sectionMode) onSectionEnd(event.point.clone());
        else onRegionEnd(event.point.clone());
      }}
    >
      <pointsMaterial size={pointSize} sizeAttenuation vertexColors />
    </points>
  );
}

export function PotreePointLayer({
  baseUrl,
  modelId,
  manifest,
  mode,
  pointSize,
  onPointsChange,
  onStatus,
  onPoint,
  sectionMode,
  onSectionStart,
  onSectionEnd,
  regionMode,
  onRegionStart,
  onRegionEnd,
}: Props) {
  const { camera, size } = useThree();
  const rootId = manifest.nodes.find((node) => node.id === "r")?.id ?? manifest.nodes[0]?.id;
  const [nodeIds, setNodeIds] = useState<string[]>(rootId ? [rootId] : []);
  const selectionKey = useRef("");
  const elapsed = useRef(1);
  const tileState = useLidarTiles(baseUrl, modelId, manifest, nodeIds);

  useEffect(() => onPointsChange(tileState.points), [onPointsChange, tileState.points]);
  useEffect(
    () => onStatus(tileState.loading, tileState.error),
    [onStatus, tileState.error, tileState.loading],
  );

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.2) return;
    elapsed.current = 0;
    camera.updateMatrixWorld();
    const next = selectPotreeNodes(manifest, camera, size.height);
    const key = next.join(",");
    if (key && key !== selectionKey.current) {
      selectionKey.current = key;
      setNodeIds(next);
    }
  });

  if (!tileState.points) return null;
  return (
    <LidarPoints
      points={tileState.points}
      mode={mode}
      pointSize={pointSize}
      onPoint={onPoint}
      sectionMode={sectionMode}
      onSectionStart={onSectionStart}
      onSectionEnd={onSectionEnd}
      regionMode={regionMode}
      onRegionStart={onRegionStart}
      onRegionEnd={onRegionEnd}
    />
  );
}
