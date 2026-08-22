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
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { useLoader } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState, Suspense, type ReactElement } from "react";
import * as THREE from "three";

import { WalkthroughControls } from "@/components/digital-twin/WalkthroughControls";
import {
  cssColor,
  MESH_GROUND_FALLBACK,
  MESH_SURFACE_FALLBACK,
  TWIN_ACCENT_FALLBACK,
} from "@/lib/digital-twin/css-color";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

/** Zoom is expressed as field of view: a narrower lens from the same standing
 *  position, never a dolly off the station. */
const DEFAULT_FOV = 75;
const MIN_FOV = 25;
const MAX_FOV = 90;
const FOV_STEP = 4;
/** Degrees of FOV per pixel of pinch spread. */
const PINCH_SENSITIVITY = 0.08;

export type MeshTwinViewerProps = {
  /** URL of the dollhouse GLB. */
  meshUrl: string;
  stations: WalkStation[];
  floors: FloorInfo[];
  /** Shown bottom-left — e.g. the estimating-grade accuracy line. */
  caption?: string;
};

/**
 * Loads PLY, not GLB. Open3D's glTF writer silently drops vertex colours — the
 * exported GLB carries only POSITION and NORMAL — so a GLB of a fully coloured
 * fusion still renders as a black silhouette. PLY keeps the colours, and it is
 * the guaranteed artefact of the pipeline anyway.
 */
function MeshBody({ url }: { url: string }): ReactElement {
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
  return <mesh geometry={geometry} material={material} />;
}

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
      const hit = hits.find((h) => h.object.type === "Mesh");
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
  stations,
  floors,
  caption,
}: MeshTwinViewerProps): ReactElement {
  const [measureActive, setMeasureActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const fovRef = useRef<number>(DEFAULT_FOV);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchRef = useRef<number>(0);

  const nav = useWalkthroughNavigation({
    stations,
    floors,
    raycastFloor: (x, y) => raycastRef.current?.(x, y) ?? null,
  });

  // Navigation must be driven ONLY by the canvas. Without this check any
  // pointer-up reaching the wrapper counts as a click on the model, so a press
  // that lands on the control bar's padding rather than exactly on a button
  // falls through and walks the user to a station instead of switching mode.
  const fromCanvas = (e: React.PointerEvent | React.WheelEvent) =>
    e.target instanceof HTMLCanvasElement;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!fromCanvas(e)) return;
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.size >= 2) {
      // A second finger converts the gesture to a pinch; drop the drag so the
      // view does not lurch as the fingers separate.
      dragRef.current = null;
      lastPinchRef.current = 0;
      return;
    }
    // Capture so a drag that leaves the element keeps rotating — without this,
    // spinning in place stops the moment the pointer crosses the edge.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Two fingers down: pinch to zoom, and suppress look-drag so the gesture
      // does not also spin the view while the user is scaling it.
      if (pinchRef.current.size >= 2) {
        pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = Array.from(pinchRef.current.values());
        const spread = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchRef.current > 0) {
          const delta = (lastPinchRef.current - spread) * PINCH_SENSITIVITY;
          fovRef.current = Math.min(MAX_FOV, Math.max(MIN_FOV, fovRef.current + delta));
        }
        lastPinchRef.current = spread;
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      // A few pixels of slop so a tap with a shaky thumb still reads as a tap.
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      nav.handleLookDrag(dx, dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
    },
    [nav],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      pinchRef.current.delete(e.pointerId);
      if (pinchRef.current.size < 2) lastPinchRef.current = 0;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (!drag || drag.moved || !fromCanvas(e)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      nav.handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    },
    [nav],
  );

  // Zoom is field of view, not dolly. Moving the camera off a station would
  // put the viewer where no imagery exists; narrowing the lens lets a
  // contractor read a detail on a far wall from where they are standing.
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!fromCanvas(e)) return;
    const next = fovRef.current + (e.deltaY > 0 ? FOV_STEP : -FOV_STEP);
    fovRef.current = Math.min(MAX_FOV, Math.max(MIN_FOV, next));
  }, []);

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
        onPointerCancel={(e) => {
          dragRef.current = null;
          pinchRef.current.delete(e.pointerId);
          lastPinchRef.current = 0;
        }}
        onWheel={handleWheel}
      >
        <Canvas
          camera={{ fov: DEFAULT_FOV, near: 0.05, far: 200 }}
          dpr={[1, 2]}
          // Graphite canvas, not the page default. On white, an unscanned hole
          // reads as missing paint on a wall; on the dark canvas it reads as a
          // hole, which is what it is.
          onCreated={({ gl }) => gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1)}
        >
          {/* Flat, bright ambient: vertex colours ARE the albedo, so directional
              shading would only wash the captured detail out. */}
          <ambientLight intensity={2.2} />
          <Suspense fallback={null}>
            <MeshBody url={meshUrl} />
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
        measureActive={measureActive}
        onToggleMeasure={() => setMeasureActive((v) => !v)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
