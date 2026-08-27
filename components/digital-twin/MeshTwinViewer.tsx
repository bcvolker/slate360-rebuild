"use client";

/**
 * M6b — the walkthrough viewer for the TSDF mesh.
 *
 * Deliberately separate from `SplatViewer`. That component serves live splat
 * models through Spark and is on the production path; the mesh is a different
 * asset with a different interaction model, so this is additive rather than a
 * rewrite of something that already works.
 *
 * The interaction model is Matterport's, not a 3D inspector's: click the floor
 * to walk to the nearest capture station, drag to look around, switch between
 * inside / dollhouse / floor plan. There is no orbit and no free-flight,
 * because photoreal imagery only exists where the operator stood.
 */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ReactElement } from "react";
import * as THREE from "three";

import { MeshBody, type CeilingState } from "@/components/digital-twin/mesh-body";
import { MeshSplatLayer } from "@/components/digital-twin/MeshSplatLayer";
import { useViewerGestures, DEFAULT_FOV } from "@/components/digital-twin/use-viewer-gestures";
import { WalkthroughControls } from "@/components/digital-twin/WalkthroughControls";
import type { TwinLayerMode } from "@/components/digital-twin/WalkthroughLayerToggle";
import {
  cssColor,
  MESH_GROUND_FALLBACK,
  TWIN_ACCENT_FALLBACK,
} from "@/lib/digital-twin/css-color";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";


export type { CeilingState };

export type MeshTwinViewerProps = {
  /** URL of the dollhouse mesh (PLY — Open3D's glTF writer drops colours). */
  meshUrl: string;
  /** Optional Spark splat in the same canvas. Look-only — never the walk surface. */
  splatUrl?: string | null;
  /** World Y to clip the ceiling at, from the pipeline's layers sidecar. */
  ceilingCutY?: number | null;
  stations: WalkStation[];
  floors: FloorInfo[];
  /** Shown bottom-left — e.g. the estimating-grade accuracy line. */
  caption?: string;
};

/** Dots the user can walk to. Rendered only on the current floor — a station
 *  one storey up is visually confusing and not reachable by clicking. */
function StationMarkers({
  stations,
  floors,
  floorIndex,
  currentId,
  visible,
}: {
  stations: WalkStation[];
  floors: FloorInfo[];
  floorIndex: number;
  currentId: string | null;
  visible: boolean;
}): ReactElement | null {
  if (!visible) return null;
  const elevation = floors.find((f) => f.index === floorIndex)?.elevationY ?? 0;
  return (
    <group>
      {stations
        .filter((s) => s.floorIndex === floorIndex)
        .map((s) => (
          <mesh
            key={s.id}
            position={[s.position[0], elevation + 0.03, s.position[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[s.id === currentId ? 0.22 : 0.16, 24]} />
            <meshBasicMaterial
              color={
                s.id === currentId
                  ? cssColor("--twin360-blue", TWIN_ACCENT_FALLBACK)
                  : cssColor("--foreground", { h: 0, s: 0, l: 1 })
              }
              transparent
              opacity={s.id === currentId ? 0.95 : 0.45}
            />
          </mesh>
        ))}
    </group>
  );
}

/** Bridges pointer input and the frame loop into the navigation hook. The hook
 *  owns no scene graph, so raycasting is supplied here. */
function NavigationRig({
  stations,
  floors,
  nav,
  fovRef,
  onFloorHit,
}: {
  stations: WalkStation[];
  floors: FloorInfo[];
  nav: ReturnType<typeof useWalkthroughNavigation>;
  fovRef: React.MutableRefObject<number>;
  onFloorHit: (fn: (x: number, y: number) => [number, number, number] | null) => void;
}): null {
  const { camera, scene, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const raycastFloor = useCallback(
    (screenX: number, screenY: number): [number, number, number] | null => {
      const ndc = new THREE.Vector2(
        (screenX / size.width) * 2 - 1,
        -(screenY / size.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => Boolean(h.object.userData?.twinWalkSurface));
      if (!hit) return null;
      return [hit.point.x, hit.point.y, hit.point.z];
    },
    [camera, raycaster, scene, size.height, size.width],
  );

  onFloorHit(raycastFloor);
  useFrame((_, delta) => {
    nav.updateCamera(camera, delta);
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera && perspective.fov !== fovRef.current) {
      perspective.fov = fovRef.current;
      perspective.updateProjectionMatrix();
    }
  });
  return null;
}

export function MeshTwinViewer({
  meshUrl,
  splatUrl,
  ceilingCutY,
  stations,
  floors,
  caption,
}: MeshTwinViewerProps): ReactElement {
  const [ceilingState, setCeilingState] = useState<CeilingState>("open");
  // Mesh is the room. The kitchen splat on disk is a failed train (collapsed
  // cloud); opening on Both made dollhouse look like debris. Splat still loads
  // if the operator asks for it.
  const [layerMode, setLayerMode] = useState<TwinLayerMode>("mesh");
  const [splatRequested, setSplatRequested] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const showMesh = layerMode !== "splat";
  const showSplat = Boolean(splatUrl) && layerMode !== "mesh";
  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showSplat) setSplatRequested(true);
  }, [showSplat]);

  const nav = useWalkthroughNavigation({
    stations,
    floors,
    raycastFloor: (x, y) => raycastRef.current?.(x, y) ?? null,
  });

  const {
    fovRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleWheel,
  } = useViewerGestures(nav);

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      void el.requestFullscreen?.();
      setIsFullscreen(true);
    }
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[var(--background)]"
      data-app="twin360"
    >
      <div
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <Canvas
          camera={{ fov: DEFAULT_FOV, near: 0.05, far: 200 }}
          dpr={[1, 2]}
          // Graphite canvas, not the page default. On white, an unscanned hole
          // reads as missing paint on a wall; on the dark canvas it reads as a
          // hole, which is what it is.
          onCreated={({ gl }) => {
            gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
            gl.localClippingEnabled = true;
          }}
        >
          {/* Flat, bright ambient: vertex colours ARE the albedo, so directional
              shading would only wash the captured detail out. */}
          {/* 1.0, not 2.2. The baked atlas has a mean channel value of ~160,
              and at 2.2 every texel above ~116 clips to pure white — which is
              ~85% of the sheet. The photographs were reaching the screen the
              whole time and being blown out into a flat white surface that read
              as "no texture". Vertex colours survived 2.2 because they averaged
              darker; a real photograph does not. Exposure belongs in the
              capture, not in the light. */}
          <ambientLight intensity={1.0} />
          <Suspense fallback={null}>
            <MeshBody
              url={meshUrl}
              ceilingCutY={ceilingCutY}
              ceilingState={ceilingState}
              display={showMesh ? "shown" : "collision"}
            />
            {splatUrl && splatRequested ? (
              <MeshSplatLayer url={splatUrl} visible={showSplat} />
            ) : null}
          </Suspense>
          <StationMarkers
            stations={stations}
            floors={floors}
            floorIndex={nav.currentFloorIndex}
            currentId={nav.currentStationId}
            visible={nav.mode !== "floorplan"}
          />
          <NavigationRig
            stations={stations}
            floors={floors}
            nav={nav}
            fovRef={fovRef}
            onFloorHit={(fn) => {
              raycastRef.current = fn;
            }}
          />
        </Canvas>
      </div>

      {caption ? (
        <p className="pointer-events-none absolute left-4 top-4 max-w-[60%] font-mono text-[10px] uppercase leading-relaxed tracking-wide text-white/50">
          {caption}
        </p>
      ) : null}

      <WalkthroughControls
        mode={nav.mode}
        onModeChange={nav.setMode}
        floors={floors}
        currentFloorIndex={nav.currentFloorIndex}
        onFloorChange={nav.setFloorIndex}
        ceilingState={ceilingState}
        onCeilingStateChange={setCeilingState}
        ceilingAvailable={ceilingCutY != null}
        layerMode={splatUrl ? layerMode : undefined}
        onLayerModeChange={splatUrl ? setLayerMode : undefined}
        measureActive={measureActive}
        onToggleMeasure={() => setMeasureActive((v) => !v)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
