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

export type MeshDisplay = "shown" | "collision";

export type MeshAppearance = {
  opacity?: number;
  wireframe?: boolean;
  /** Lambert + vertex colours when the GLB has COLOR_0 and no atlas. */
  finish?: "gltf" | "architectural";
};

type BodyProps = {
  url: string;
  ceilingCutY?: number | null;
  ceilingState: CeilingState;
  /**
   * `collision` keeps the LiDAR surface in the raycaster (click-to-walk) while
   * drawing nothing — splat-only mode still needs a floor to walk on.
   */
  display?: MeshDisplay;
  appearance?: MeshAppearance;
};

/**
 * Ceiling clipping and the two draw calls. Takes a FINISHED material rather
 * than building one: the GLB path must render the material glTF already
 * described, and reconstructing it by hand is how the baked atlas ended up
 * invisible — one missed field and the mesh silently falls back to a flat
 * token colour that looks like a deliberate design choice.
 */
function Surface({
  geometry,
  material,
  ceilingCutY,
  ceilingState,
  display = "shown",
  appearance,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  ceilingCutY?: number | null;
  ceilingState: CeilingState;
  display?: MeshDisplay;
  appearance?: MeshAppearance;
}): ReactElement {
  const clipped = useMemo(() => {
    let m = material;
    if (ceilingCutY != null && ceilingState !== "closed") {
      m = material.clone();
      m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), ceilingCutY)];
      m.clipShadows = true;
    }
    if (display === "collision") {
      m = m.clone();
      m.colorWrite = false;
      m.depthWrite = false;
    } else {
      if (typeof appearance?.opacity === "number" && appearance.opacity < 1) {
        m = m.clone();
        m.transparent = true;
        m.opacity = appearance.opacity;
        m.depthWrite = appearance.opacity > 0.95;
      }
      if (appearance?.wireframe) {
        m = m.clone();
        m.wireframe = true;
      }
    }
    return m;
  }, [material, ceilingCutY, ceilingState, display, appearance]);

  // Built unconditionally — a hook cannot live inside a conditional branch of
  // the JSX below. Only its USE is conditional.
  const ghostLid = useMemo(() => {
    if (ceilingCutY == null || display === "collision") return null;
    const m = material.clone();
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -ceilingCutY)];
    m.transparent = true;
    m.opacity = 0.22;
    m.depthWrite = false;
    return m;
  }, [material, ceilingCutY, display]);

  return (
    <>
      <mesh geometry={geometry} material={clipped} userData={{ twinWalkSurface: true }} />
      {/* Plenum: the lid returns, ghosted, so what is above it stays readable. */}
      {ceilingState === "plenum" && ghostLid ? (
        <mesh geometry={geometry} material={ghostLid} userData={{ twinWalkSurface: true }} />
      ) : null}
    </>
  );
}

/**
 * PLY carries per-vertex colour: one sample per vertex, so on a 250k-triangle
 * dollhouse that is a colour every ~4.5 cm however good the photographs were.
 * The fallback for captures with no baked atlas.
 */
function PlyBody({ url, ceilingCutY, ceilingState, display, appearance }: BodyProps): ReactElement {
  const geometry = useLoader(PLYLoader, url);
  const material = useMemo(() => {
    const hasVertexColors = Boolean(geometry.getAttribute("color"));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return new THREE.MeshLambertMaterial({
      color: hasVertexColors
        ? new THREE.Color(1, 1, 1)
        : cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
      vertexColors: hasVertexColors,
      side: THREE.DoubleSide,
    });
  }, [geometry]);

  return (
    <Surface
      geometry={geometry}
      material={material}
      ceilingCutY={ceilingCutY}
      ceilingState={ceilingState}
      display={display}
      appearance={appearance}
    />
  );
}

/**
 * GLB carrying a UV atlas — the sharp path, where texture resolution is
 * decoupled from mesh density.
 *
 * Uses the material GLTFLoader produced, adjusted in place rather than rebuilt.
 * The mesh is exported single-sided and a TSDF's winding is not reliable, so
 * back faces would drop out; ambient-only lighting also needs roughness pinned
 * or the surface reads as plastic.
 */
function GlbBody({ url, ceilingCutY, ceilingState, display, appearance }: BodyProps): ReactElement {
  const gltf = useLoader(GLTFLoader, url);

  const { geometry, material } = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((child) => {
      const candidate = child as THREE.Mesh;
      if (!mesh && candidate.isMesh) mesh = candidate;
    });
    const found = mesh as THREE.Mesh | null;
    if (!found) {
      return {
        geometry: new THREE.BufferGeometry(),
        material: new THREE.MeshLambertMaterial({
          color: cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
          side: THREE.DoubleSide,
        }),
      };
    }

    const source = (
      Array.isArray(found.material) ? found.material[0] : found.material
    ) as THREE.MeshStandardMaterial;
    if (!found.geometry.getAttribute("normal")) found.geometry.computeVertexNormals();
    const colorAttr = found.geometry.getAttribute("color");
    const architectural = appearance?.finish === "architectural" && !source.map;

    if (architectural) {
      const lambert = new THREE.MeshLambertMaterial({
        color: colorAttr
          ? new THREE.Color(1, 1, 1)
          : cssColor("--muted-foreground", MESH_SURFACE_FALLBACK),
        vertexColors: Boolean(colorAttr),
        // Interior human-eye: FrontSide. DoubleSide made TSDF sheets read as fins.
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      return { geometry: found.geometry, material: lambert };
    }

    // Keep the glTF material. Rebuilding it (MeshBasic, dropped map, UV channel)
    // is how this preview went to a flat sticker for days while the JPEG sat
    // inside the GLB unused.
    source.side = THREE.DoubleSide;
    source.roughness = 0.95;
    source.metalness = 0;
    if (source.map) {
      source.map.colorSpace = THREE.SRGBColorSpace;
      source.map.generateMipmaps = false;
      source.map.minFilter = THREE.LinearFilter;
      source.map.magFilter = THREE.LinearFilter;
      source.map.needsUpdate = true;
    } else if (colorAttr) {
      source.vertexColors = true;
      source.color.setRGB(1, 1, 1);
    }
    source.needsUpdate = true;
    return { geometry: found.geometry, material: source };
  }, [gltf, appearance?.finish]);

  return (
    <Surface
      geometry={geometry}
      material={material}
      ceilingCutY={ceilingCutY}
      ceilingState={ceilingState}
      display={display}
      appearance={appearance}
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
