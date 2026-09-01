"use client";

import type { ReactElement } from "react";

import { MeshSplatLayer } from "@/components/digital-twin/MeshSplatLayer";
import {
  KITCHEN_SPLAT_IDENTITY_MATRIX,
  KITCHEN_SPLAT_MAX,
} from "@/lib/digital-twin/kitchen-proof-world";

export function KitchenAppearanceLayer({
  url,
  visible,
  onReady,
}: {
  url: string;
  visible: boolean;
  onReady?: () => void;
}): ReactElement {
  return (
    <MeshSplatLayer
      url={url}
      visible={visible}
      worldMatrix={KITCHEN_SPLAT_IDENTITY_MATRIX}
      sparkPiFlip={false}
      maxSplats={KITCHEN_SPLAT_MAX}
      onReady={onReady}
    />
  );
}
