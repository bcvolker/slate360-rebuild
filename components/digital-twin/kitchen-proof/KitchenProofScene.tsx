"use client";

import { Canvas } from "@react-three/fiber";
import type { MutableRefObject, ReactElement } from "react";
import * as THREE from "three";

import { KitchenAppearanceLayer } from "@/components/digital-twin/kitchen-proof/KitchenAppearanceLayer";
import { KitchenLocomotionRig } from "@/components/digital-twin/kitchen-proof/KitchenLocomotionRig";
import { KitchenMeshLayer } from "@/components/digital-twin/kitchen-proof/KitchenMeshLayer";
import { FpsProbe } from "@/components/digital-twin/kitchen-proof/kitchen-proof-api";
import { NavigationRig, type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { HybridSceneOverlays } from "@/components/digital-twin/hybrid/HybridSceneOverlays";
import type { KitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import type { WalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import type { HybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { cssColor, MESH_GROUND_FALLBACK, MESH_SURFACE_FALLBACK } from "@/lib/digital-twin/css-color";
import { KITCHEN_FLOOR_Y, KITCHEN_HUMAN_FOV } from "@/lib/digital-twin/kitchen-proof-world";
import type { SplatLoadStats } from "@/lib/digital-twin/spark-appearance-load";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export function KitchenProofScene({
  displayGeometry,
  navGeometry,
  measureGeometry,
  appearanceUrl,
  appearanceKey = 0,
  layer,
  splatReady,
  onAppearanceReady,
  nav,
  loco,
  fovRef,
  fpsRef,
  infoRef,
  raycastRef,
  metricRef,
  measure,
}: {
  displayGeometry: THREE.BufferGeometry | null;
  navGeometry: THREE.BufferGeometry | null;
  measureGeometry: THREE.BufferGeometry | null;
  appearanceUrl: string | null;
  appearanceKey?: number;
  layer: TwinLayerRepresentation;
  splatReady: boolean;
  onAppearanceReady: (stats?: SplatLoadStats) => void;
  nav: WalkthroughNavigation;
  loco: KitchenLocomotion;
  fovRef: MutableRefObject<number>;
  fpsRef: MutableRefObject<number>;
  infoRef: MutableRefObject<number | null>;
  raycastRef: MutableRefObject<((x: number, y: number) => [number, number, number] | null) | null>;
  metricRef: MutableRefObject<((x: number, y: number) => MetricHit | null) | null>;
  measure: HybridMeasureTool;
}): ReactElement {
  const overview = nav.mode !== "inside";
  const showSplat =
    Boolean(appearanceUrl) && (layer === "reality" || layer === "hybrid");
  const showGeometry =
    overview || layer === "geometry" || layer === "hybrid" || !splatReady;

  return (
    <Canvas
      camera={{ fov: KITCHEN_HUMAN_FOV, near: 0.06, far: 60 }}
      dpr={[1, 1]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        infoRef.current = gl.info.render.calls;
      }}
    >
      <hemisphereLight
        intensity={0.9}
        color={cssColor("--muted-foreground", MESH_SURFACE_FALLBACK)}
        groundColor={cssColor("--graphite-canvas", MESH_GROUND_FALLBACK)}
      />
      <directionalLight intensity={0.28} position={[3.5, 6.5, 2]} />
      <ambientLight intensity={0.32} />
      {displayGeometry ? (
        <KitchenMeshLayer
          geometry={displayGeometry}
          role="display"
          visible={showGeometry}
          opacity={layer === "hybrid" ? 0.16 : 1}
        />
      ) : null}
      {navGeometry ? <KitchenMeshLayer geometry={navGeometry} role="nav" collisionOnly /> : null}
      {measureGeometry ? (
        <KitchenMeshLayer geometry={measureGeometry} role="measure" collisionOnly />
      ) : null}
      {appearanceUrl ? (
        <KitchenAppearanceLayer
          key={appearanceKey}
          url={appearanceUrl}
          visible={showSplat}
          onReady={onAppearanceReady}
        />
      ) : null}
      <HybridSceneOverlays
        measurements={measure.rows}
        pins={[]}
        draftPoints={measure.draft}
        hover={measure.hover}
        showMeasurements={measure.active || measure.rows.length > 0}
        showPins={false}
      />
      <NavigationRig
        nav={nav}
        fovRef={fovRef}
        driveCamera={nav.mode !== "inside"}
        onFloorHit={(fn) => {
          raycastRef.current = fn;
        }}
        onMetricHit={(fn) => {
          metricRef.current = fn;
        }}
      />
      <KitchenLocomotionRig
        loco={loco}
        nav={nav}
        fovRef={fovRef}
        floorY={KITCHEN_FLOOR_Y}
        enabled={nav.mode === "inside"}
      />
      <FpsProbe fpsRef={fpsRef} />
    </Canvas>
  );
}
