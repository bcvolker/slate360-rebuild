"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import type * as THREE from "three";
import { SplatEdit, SplatEditRgbaBlendMode, SplatEditSdf, SplatEditSdfType } from "@sparkjsdev/spark";

/**
 * One presentation crop (keep inside `box`, hide outside), as a Spark SDF edit parented to the room-frame group,
 * so `box` is in V. Spark encodes each SDF from its own matrixWorld and evaluates it at splat centres; the box's
 * half-extents go on the SDF's scale (Spark packs sdf.scale into the box size). Reversible: nothing touches the
 * splat data.
 */
export function RoomCrop({ parent, box }: { parent: THREE.Object3D | null; box: THREE.Box3 }) {
  const edit = useMemo(() => {
    const e = new SplatEdit({ rgbaBlendMode: SplatEditRgbaBlendMode.MULTIPLY, sdfSmooth: 0, softEdge: 0.02, invert: false });
    e.name = "room213-crop";
    const sdf = new SplatEditSdf({ type: SplatEditSdfType.BOX, opacity: 0, invert: true, radius: 0 });
    e.addSdf(sdf);
    return { e, sdf };
  }, []);

  useEffect(() => {
    if (!parent) return;
    parent.add(edit.e);
    return () => {
      edit.e.removeFromParent();
    };
  }, [parent, edit]);

  // Layout effect: the new crop is in place before the next rendered frame, so the first generation after a view
  // switch already uses it. Applied once per change — every extra SDF write bumps Spark's version and restarts its
  // full depth sort.
  useLayoutEffect(() => {
    box.getCenter(edit.sdf.position);
    box.getSize(edit.sdf.scale).multiplyScalar(0.5);
    edit.sdf.updateMatrixWorld(true);
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (w.__r213) w.__r213.crop = { center: edit.sdf.position.toArray(), half: edit.sdf.scale.toArray() };
  }, [box, edit]);

  return null;
}
