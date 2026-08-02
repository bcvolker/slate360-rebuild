"use client";

import { useEffect, useState } from "react";
import type { LidarManifest, LidarNode } from "@/lib/digital-twin/lidar-contract";

export type LidarPointData = {
  positions: Float32Array;
  colors: Uint8Array;
  deviations: Float32Array;
  slopes: Float32Array;
};

type State = {
  manifest: LidarManifest | null;
  points: LidarPointData | null;
  loading: boolean;
  error: string | null;
};

const MAX_VIEWER_POINTS = 1_500_000;

type PntsAttribute = { byteOffset?: number };
type PntsFeatureTable = {
  POINTS_LENGTH: number;
  POSITION: PntsAttribute;
  RGB?: PntsAttribute;
  BATCH_ID?: PntsAttribute;
  RTC_CENTER?: number[];
};
type PntsBatchAttribute = { byteOffset?: number };

function readJson<T>(buffer: ArrayBuffer, offset: number, length: number): T {
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, length))) as T;
}

function decodeNode(buffer: ArrayBuffer, node: LidarNode): LidarPointData {
  const view = new DataView(buffer);
  if (view.getUint32(0, false) !== 0x706e7473 || view.getUint32(4, true) !== 1) {
    throw new Error(`Invalid 3D Tiles point cloud ${node.id}`);
  }
  const byteLength = view.getUint32(8, true);
  const featureJsonLength = view.getUint32(12, true);
  const featureBinaryLength = view.getUint32(16, true);
  const batchJsonLength = view.getUint32(20, true);
  const batchBinaryLength = view.getUint32(24, true);
  if (byteLength > buffer.byteLength || byteLength < 28 + featureJsonLength + featureBinaryLength) {
    throw new Error(`Truncated 3D Tiles point cloud ${node.id}`);
  }
  const featureJson = readJson<PntsFeatureTable>(buffer, 28, featureJsonLength);
  const featureBinaryOffset = 28 + featureJsonLength;
  const batchJsonOffset = featureBinaryOffset + featureBinaryLength;
  const batchBinaryOffset = batchJsonOffset + batchJsonLength;
  const batchJson = readJson<Record<string, PntsBatchAttribute>>(
    buffer,
    batchJsonOffset,
    batchJsonLength,
  );
  const count = featureJson.POINTS_LENGTH;
  const positionOffset = featureBinaryOffset + (featureJson.POSITION.byteOffset ?? 0);
  const colorOffset = featureBinaryOffset + (featureJson.RGB?.byteOffset ?? count * 12);
  const deviationOffset =
    batchBinaryOffset + (batchJson.deviation?.byteOffset ?? Number.MAX_SAFE_INTEGER);
  const slopeOffset = batchBinaryOffset + (batchJson.slope?.byteOffset ?? Number.MAX_SAFE_INTEGER);
  const center = featureJson.RTC_CENTER ?? [0, 0, 0];
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    positionOffset + count * 12 > featureBinaryOffset + featureBinaryLength ||
    colorOffset + count * 3 > featureBinaryOffset + featureBinaryLength ||
    batchBinaryOffset + batchBinaryLength > buffer.byteLength
  ) {
    throw new Error(`Invalid 3D Tiles attributes ${node.id}`);
  }
  const positions = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  const deviations = new Float32Array(count);
  const slopes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const position = positionOffset + index * 12;
    positions[index * 3] = view.getFloat32(position, true) + (center[0] ?? 0);
    positions[index * 3 + 1] = view.getFloat32(position + 4, true) + (center[1] ?? 0);
    positions[index * 3 + 2] = view.getFloat32(position + 8, true) + (center[2] ?? 0);
    const color = colorOffset + index * 3;
    colors[index * 3] = view.getUint8(color);
    colors[index * 3 + 1] = view.getUint8(color + 1);
    colors[index * 3 + 2] = view.getUint8(color + 2);
    if (deviationOffset + (index + 1) * 4 <= batchBinaryOffset + batchBinaryLength) {
      deviations[index] = view.getFloat32(deviationOffset + index * 4, true);
    }
    if (slopeOffset + (index + 1) * 4 <= batchBinaryOffset + batchBinaryLength) {
      slopes[index] = view.getFloat32(slopeOffset + index * 4, true);
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

export function useLidarTiles(baseUrl: string, modelId?: string | null): State {
  const [state, setState] = useState<State>({
    manifest: null,
    points: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ manifest: null, points: null, loading: true, error: null });
    void (async () => {
      try {
        const query = modelId ? `?modelId=${encodeURIComponent(modelId)}` : "";
        const manifestResponse = await fetch(`${baseUrl}/manifest.json${query}`, {
          signal: controller.signal,
        });
        if (!manifestResponse.ok) throw new Error("LiDAR manifest unavailable");
        const manifest = (await manifestResponse.json()) as LidarManifest;
        const leaves = manifest.nodes.filter((node) => node.leaf && node.path);
        const decoded = await Promise.all(
          leaves.map(async (node) => {
            const response = await fetch(`${baseUrl}/${node.path!}${query}`, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`LiDAR tile ${node.id} unavailable`);
            return decodeNode(await response.arrayBuffer(), node);
          }),
        );
        if (!controller.signal.aborted) {
          setState({ manifest, points: mergeNodes(decoded), loading: false, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            manifest: null,
            points: null,
            loading: false,
            error: error instanceof Error ? error.message : "LiDAR load failed",
          });
        }
      }
    })();
    return () => controller.abort();
  }, [baseUrl, modelId]);

  return state;
}
