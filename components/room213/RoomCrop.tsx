"use client";

import { useEffect, useMemo } from "react";
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
    const e = new SplatEdit({ rgbaBlendMode: SplatEditRgbaBlendMode.MULTIPLY, sdfSmooth: 0.02, softEdge: 0.02, invert: false });
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

  useEffect(() => {
    const apply = (nudge: number) => {
      box.getCenter(edit.sdf.position);
      box.getSize(edit.sdf.scale).multiplyScalar(0.5);
      edit.sdf.position.y += nudge;
      edit.sdf.updateMatrixWorld(true);
    };
    apply(0);
    // Re-assert shortly after a change: a crop change landing in the same frames as other Spark work (camera or
    // mesh-visibility switches) was occasionally not regenerated (measured intermittently on Walk → Plan). A
    // negligible nudge forces a fresh edit version once any pending generation has finished.
    const t1 = window.setTimeout(() => apply(1e-5), 120);
    const t2 = window.setTimeout(() => apply(0), 600);
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (w.__r213) w.__r213.crop = { center: edit.sdf.position.toArray(), half: edit.sdf.scale.toArray() };
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [box, edit]);

  return null;
}
