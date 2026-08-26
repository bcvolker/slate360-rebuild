"use client";

/**
 * Mesh rendering and the ceiling layer, split out of MeshTwinViewer to keep
 * that file under the size guard and to keep one concern per module: this owns
 * what the geometry LOOKS like, the viewer owns how you move through it.
 */

import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

type BodyProps = {
  url: string;
  ceilingCutY?: number | null;
  ceilingState: CeilingState;
};

/**
 * The shared half: material, ceiling clipping, and the two draw calls. Takes an
 * already-loaded geometry so the PLY and GLB paths can each call their own
 * loader hook unconditionally.
 */
function Surface({
  geometry,
  map,
  ceilingCutY,
  ceilingState,
}: {
  geometry: THREE.BufferGeometry;
  map: THREE.Texture | null;
  ceilingCutY?: number | null;
  ceilingState: CeilingState;
}): ReactElement {
  const material = useMemo(() => {
    const hasVertexColors = Boolean(geometry.getAttribute("color"));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return new THREE.MeshStandardMaterial({
      // White base so a texture map or vertex colours pass through
      // unmodulated; the token colour is only for an untextured capture.
      color:
        map || hasVertexColors
          ? new THREE.Color(1, 1, 1)
          : cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
      map: map ?? undefined,
      // An atlas supersedes vertex colours — leaving both on multiplies the
      // 4.5 cm vertex wash back over the texture we baked to escape it.
      vertexColors: map ? false : hasVertexColors,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, [geometry, map]);

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

/**
 * PLY carries per-vertex colour: one sample per vertex, so on a 250k-triangle
 * dollhouse that is a colour every ~4.5 cm however good the photographs were.
 * Kept as the fallback for captures with no baked atlas.
 */
function PlyBody({ url, ceilingCutY, ceilingState }: BodyProps): ReactElement {
  const geometry = useLoader(PLYLoader, url);
  return (
    <Surface
      geometry={geometry}
      map={null}
      ceilingCutY={ceilingCutY}
      ceilingState={ceilingState}
    />
  );
}

/**
 * GLB carrying a UV atlas — the sharp path. Texture resolution is decoupled
 * from mesh resolution here, which is the whole reason the atlas exists.
 */
function GlbBody({ url, ceilingCutY, ceilingState }: BodyProps): ReactElement {
  const gltf = useLoader(GLTFLoader, url);
  const { geometry, map } = useMemo(() => {
    let found: THREE.Mesh | null = null;
    gltf.scene.traverse((child) => {
      if (!found && (child as THREE.Mesh).isMesh) found = child as THREE.Mesh;
    });
    const mesh = found as THREE.Mesh | null;
    if (!mesh) return { geometry: new THREE.BufferGeometry(), map: null };
    const source = mesh.material as THREE.MeshStandardMaterial | undefined;
    const texture = source?.map ?? null;
    if (texture) {
      // glTF textures decode as sRGB; leaving them linear washes the whole
      // room out to a pale, chalky version of the photographs.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
    }
    return { geometry: mesh.geometry, map: texture };
  }, [gltf]);

  return (
    <Surface
      geometry={geometry}
      map={map}
      ceilingCutY={ceilingCutY}
      ceilingState={ceilingState}
    />
  );
}

/**
 * Picks the loader by extension. Each branch is its own component so that both
 * call their loader hook unconditionally — swapping loaders inside one
 * component would break the rules of hooks the moment the url changed type.
 */
export function MeshBody(props: BodyProps): ReactElement {
  const isGlb = props.url.toLowerCase().includes(".glb");
  return isGlb ? <GlbBody {...props} /> : <PlyBody {...props} />;
}
