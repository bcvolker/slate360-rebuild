"use client";

/**
 * Mesh rendering and the ceiling layer, split out of MeshTwinViewer to keep
 * that file under the size guard and to keep one concern per module: this owns
 * what the geometry LOOKS like, the viewer owns how you move through it.
 */

import { useLoader } from "@react-three/fiber";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { useMemo, type ReactElement } from "react";
import * as THREE from "three";

import { cssColor, MESH_SURFACE_FALLBACK } from "@/lib/digital-twin/css-color";

/**
 * Ceiling is a render-time layer, never a deletion. `open` is the dollhouse
 * everyone knows; `closed` is needed for soffits, finishes and leak staining;
 * `plenum` ghosts the lid so duct, tray and sprinkler read before they are
 * buried — the MEP view a cut-away dollhouse cannot show at all.
 */
export type CeilingState = "open" | "closed" | "plenum";

/**
 * Loads PLY, not GLB. Open3D's glTF writer silently drops vertex colours — the
 * exported GLB carries only POSITION and NORMAL — so a GLB of a fully coloured
 * fusion still renders as a black silhouette. PLY keeps the colours, and it is
 * the guaranteed artefact of the pipeline anyway.
 */
export function MeshBody({
  url,
  ceilingCutY,
  ceilingState,
}: {
  url: string;
  ceilingCutY?: number | null;
  ceilingState: CeilingState;
}): ReactElement {
  const geometry = useLoader(PLYLoader, url);
  const material = useMemo(() => {
    const hasVertexColors = Boolean(geometry.getAttribute("color"));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return new THREE.MeshStandardMaterial({
      // White base so vertex colours pass through unmodulated; the token
      // colour is only for an untextured capture.
      color: hasVertexColors
        ? new THREE.Color(1, 1, 1)
        : cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
      vertexColors: hasVertexColors,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, [geometry]);
  // Clip in the shader rather than rebuilding geometry, so toggling is instant
  // and the same buffers serve all three states.
  const clipped = useMemo(() => {
    if (ceilingCutY == null || ceilingState === "closed") return material;
    const m = material.clone();
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), ceilingCutY)];
    m.clipShadows = true;
    return m;
  }, [material, ceilingCutY, ceilingState]);

  // Built unconditionally — a hook cannot live inside a conditional branch of
  // the JSX below. Only its USE is conditional.
  const ghostLid = useMemo(() => {
    if (ceilingCutY == null) return null;
    const m = material.clone();
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -ceilingCutY)];
    m.transparent = true;
    m.opacity = 0.22;
    m.depthWrite = false;
    return m;
  }, [material, ceilingCutY]);

  return (
    <>
      <mesh geometry={geometry} material={clipped} />
      {/* Plenum: the lid returns, ghosted, so what is above it stays readable. */}
      {ceilingState === "plenum" && ghostLid ? (
        <mesh geometry={geometry} material={ghostLid} />
      ) : null}
    </>
  );
}

