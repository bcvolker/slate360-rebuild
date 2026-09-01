"use client";

import type { ReactElement } from "react";

import { MeshSplatLayer } from "@/components/digital-twin/MeshSplatLayer";
import {
  KITCHEN_SPLAT_MAX,
  KITCHEN_SPLAT_WORLD_MATRIX,
} from "@/lib/digital-twin/kitchen-proof-world";
import type { SplatLoadStats } from "@/lib/digital-twin/spark-appearance-load";

export function KitchenAppearanceLayer({
  url,
  visible,
  onReady,
}: {
  url: string;
  visible: boolean;
  onReady?: (stats?: SplatLoadStats) => void;
}): ReactElement {
  return (
    <MeshSplatLayer
      url={url}
      visible={visible}
      worldMatrix={KITCHEN_SPLAT_WORLD_MATRIX}
      sparkPiFlip={false}
      lodSplatCount={KITCHEN_SPLAT_MAX}
      onReady={onReady}
    />
  );
}
