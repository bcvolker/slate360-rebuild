"use client";

import { useEffect, useState } from "react";
import { Box3, Frustum, Matrix4, Vector3, type Camera, type PerspectiveCamera } from "three";
import type { LidarManifest, LidarNode } from "@/lib/digital-twin/lidar-contract";

export type LidarPointData = {
  positions: Float32Array;
  colors: Uint8Array;
  deviations: Float32Array;
  slopes: Float32Array;
};

type HierarchyState = {
  manifest: LidarManifest | null;
  loading: boolean;
  error: string | null;
};

type TileState = {
  points: LidarPointData | null;
  loading: boolean;
  error: string | null;
};

const MAX_VIEWER_POINTS = 1_500_000;
const MAX_SELECTED_NODES = 36;

function nodeCenter(node: LidarNode): [number, number, number] {
  return [
    (node.bounds.min[0] + node.bounds.max[0]) / 2,
    (node.bounds.min[1] + node.bounds.max[1]) / 2,
    (node.bounds.min[2] + node.bounds.max[2]) / 2,
  ];
}

function nodeRadius(node: LidarNode): number {
  return Math.max(
    node.bounds.max[0] - node.bounds.min[0],
    node.bounds.max[1] - node.bounds.min[1],
    node.bounds.max[2] - node.bounds.min[2],
    0.01,
  ) * 0.5;
}

/** Frustum + LOD selection for Potree hierarchy nodes. */
export function selectPotreeNodes(
  manifest: LidarManifest,
  camera: Camera,
  viewportHeight: number,
): string[] {
  const projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new Frustum().setFromProjectionMatrix(projection);
  const fov =
    "fov" in camera && typeof (camera as PerspectiveCamera).fov === "number"
      ? ((camera as PerspectiveCamera).fov * Math.PI) / 180
      : Math.PI / 3;
  const root = manifest.nodes.find((node) => node.id === "r") ?? manifest.nodes[0];
  if (!root) return [];
  const rootCenter = nodeCenter(root);
  const distance = Math.max(
    camera.position.distanceTo(new Vector3(...rootCenter)),
    0.05,
  );
  const rootScreenSize =
    (nodeRadius(root) * viewportHeight) / (distance * Math.tan(fov * 0.5));
  const spacing = Math.max(manifest.spacing ?? 0.05, 0.01);
  const maxLevel = manifest.nodes.reduce((max, node) => Math.max(max, node.level), 0);
  const targetLevel = Math.min(
    maxLevel,
    Math.max(0, Math.floor(Math.log2(Math.max(rootScreenSize / (spacing * 40), 1)))),
  );
  const visible = manifest.nodes.filter((node) => {
    if (!node.path || node.level > targetLevel) return false;
    return frustum.intersectsBox(
      new Box3(new Vector3(...node.bounds.min), new Vector3(...node.bounds.max)),
    );
  });
  const selected = visible.filter(
    (node) =>
      !visible.some(
        (child) => child.level > node.level && child.id.startsWith(node.id),
      ),
  );
  if (selected.length) {
    return selected
      .sort((a, b) => nodeCenter(a)[0] - nodeCenter(b)[0])
      .slice(0, MAX_SELECTED_NODES)
      .map((node) => node.id);
  }
  return visible.slice(0, Math.min(4, visible.length)).map((node) => node.id);
}

function decodePotreeNode(
  buffer: ArrayBuffer,
  valuesBuffer: ArrayBuffer | null,
  hierarchy: LidarManifest,
): LidarPointData {
  const stride = hierarchy.pointStride ?? 16;
  const positionOffset = hierarchy.positionOffset ?? 0;
  const colorOffset = hierarchy.colorOffset ?? 12;
  const scale = hierarchy.scale ?? 0.001;
  const offset = hierarchy.offset ?? [0, 0, 0];
  const count = Math.floor(buffer.byteLength / stride);
  const view = new DataView(buffer);
  const positions = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  const deviations = new Float32Array(count);
  const slopes = new Float32Array(count);
  const values =
    valuesBuffer && valuesBuffer.byteLength >= count * 8 ? new DataView(valuesBuffer) : null;
  for (let index = 0; index < count; index += 1) {
    const base = index * stride;
    positions[index * 3] = view.getInt32(base + positionOffset, true) * scale + offset[0];
    positions[index * 3 + 1] = view.getInt32(base + positionOffset + 4, true) * scale + offset[1];
    positions[index * 3 + 2] = view.getInt32(base + positionOffset + 8, true) * scale + offset[2];
    colors[index * 3] = view.getUint8(base + colorOffset);
    colors[index * 3 + 1] = view.getUint8(base + colorOffset + 1);
    colors[index * 3 + 2] = view.getUint8(base + colorOffset + 2);
    if (values) {
      deviations[index] = values.getFloat32(index * 8, true);
      slopes[index] = values.getFloat32(index * 8 + 4, true);
    }
  }
  return { positions, colors, deviations, slopes };
}

function mergeNodes(nodes: LidarPointData[]): LidarPointData {
  const total = nodes.reduce((sum, node) => sum + node.deviations.length, 0);
  const stride = Math.max(1, Math.ceil(total / MAX_VIEWER_POINTS));
  const keptCount = nodes.reduce(
    (sum, node) => sum + Math.ceil(node.deviations.length / stride),
    0,
  );
  const positions = new Float32Array(keptCount * 3);
  const colors = new Uint8Array(keptCount * 3);
  const deviations = new Float32Array(keptCount);
  const slopes = new Float32Array(keptCount);
  let cursor = 0;
  for (const node of nodes) {
    for (let source = 0; source < node.deviations.length; source += stride) {
      positions.set(node.positions.subarray(source * 3, source * 3 + 3), cursor * 3);
      colors.set(node.colors.subarray(source * 3, source * 3 + 3), cursor * 3);
      deviations[cursor] = node.deviations[source];
      slopes[cursor] = node.slopes[source];
      cursor += 1;
    }
  }
  return { positions, colors, deviations, slopes };
}

export function useLidarHierarchy(baseUrl: string, modelId?: string | null): HierarchyState {
  const [state, setState] = useState<HierarchyState>({
    manifest: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ manifest: null, loading: true, error: null });
    void (async () => {
      try {
        const query = modelId ? `?modelId=${encodeURIComponent(modelId)}` : "";
        const response = await fetch(`${baseUrl}/hierarchy.json${query}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("LiDAR hierarchy unavailable");
        const manifest = (await response.json()) as LidarManifest;
        if (!controller.signal.aborted) {
          setState({ manifest, loading: false, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            manifest: null,
            loading: false,
            error: error instanceof Error ? error.message : "LiDAR hierarchy failed",
          });
        }
      }
    })();
    return () => controller.abort();
  }, [baseUrl, modelId]);

  return state;
}

export function useLidarTiles(
  baseUrl: string,
  modelId: string | null | undefined,
  manifest: LidarManifest | null,
  nodeIds: string[],
): TileState {
  const [state, setState] = useState<TileState>({
    points: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!manifest || !nodeIds.length) {
      setState({ points: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    void (async () => {
      try {
        const query = modelId ? `?modelId=${encodeURIComponent(modelId)}` : "";
        const byId = new Map(manifest.nodes.map((node) => [node.id, node]));
        const nodes = nodeIds
          .map((id) => byId.get(id))
          .filter((node): node is LidarNode => Boolean(node?.path));
        const decoded = await Promise.all(
          nodes.map(async (node) => {
            const response = await fetch(`${baseUrl}/${node.path!}${query}`, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`LiDAR tile ${node.id} unavailable`);
            let valuesBuffer: ArrayBuffer | null = null;
            if (node.valuesPath) {
              const valuesResponse = await fetch(`${baseUrl}/${node.valuesPath}${query}`, {
                signal: controller.signal,
              });
              if (valuesResponse.ok) valuesBuffer = await valuesResponse.arrayBuffer();
            }
            return decodePotreeNode(await response.arrayBuffer(), valuesBuffer, manifest);
          }),
        );
        if (!controller.signal.aborted) {
          setState({ points: mergeNodes(decoded), loading: false, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            points: null,
            loading: false,
            error: error instanceof Error ? error.message : "LiDAR tile load failed",
          });
        }
      }
    })();
    return () => controller.abort();
  }, [baseUrl, modelId, manifest, nodeIds.join("|")]);

  return state;
}
