"use client";

/**
 * Kitchen visual proof: human-eye camera, Reality / Hybrid / Geometry,
 * V1 X4 Gaussian via locked EXACT_FRAME_SIM3. No debug chrome.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import * as THREE from "three";

import { MeshBody } from "@/components/digital-twin/mesh-body";
import { MeshSplatLayer } from "@/components/digital-twin/MeshSplatLayer";
import { KitchenProofHud } from "@/components/digital-twin/kitchen-proof/KitchenProofHud";
import { useViewerGestures } from "@/components/digital-twin/use-viewer-gestures";
import { NavigationRig, type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { HybridMeasureHud } from "@/components/digital-twin/hybrid/HybridMeasureHud";
import { HybridSceneOverlays } from "@/components/digital-twin/hybrid/HybridSceneOverlays";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import { cssColor, MESH_GROUND_FALLBACK, MESH_SURFACE_FALLBACK } from "@/lib/digital-twin/css-color";
import {
  KITCHEN_CEILING_CUT_Y,
  KITCHEN_FLOORS,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
} from "@/lib/digital-twin/kitchen-proof-world";
import {
  meshDisplayFor,
  splatVisibleFor,
  type TwinLayerRepresentation,
} from "@/lib/digital-twin/twin-epoch";

type ProofApi = {
  setLayer: (layer: TwinLayerRepresentation) => void;
  setView: (mode: "inside" | "dollhouse" | "floorplan") => void;
  goStation: (id: string) => void;
  toggleMeasure: () => void;
  layer: () => TwinLayerRepresentation;
  fps: () => number;
  timings: () => { glbMs: number | null; parseMs: number | null };
};

function FpsProbe({ fpsRef }: { fpsRef: React.MutableRefObject<number> }): null {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, delta) => {
    acc.current.t += delta;
    acc.current.n += 1;
    if (acc.current.t >= 0.5) {
      fpsRef.current = acc.current.n / acc.current.t;
      acc.current = { t: 0, n: 0 };
    }
  });
  return null;
}

export function KitchenProofViewer({
  meshUrl,
  splatUrl,
}: {
  meshUrl: string;
  splatUrl: string;
}): ReactElement {
  const [layer, setLayer] = useState<TwinLayerRepresentation>("geometry");
  const [meshOpacity, setMeshOpacity] = useState(1);
  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const metricRef = useRef<((x: number, y: number) => MetricHit | null) | null>(null);
  const fpsRef = useRef(0);
  const loadRef = useRef({ glbMs: null as number | null, parseMs: null as number | null });

  const nav = useWalkthroughNavigation({
    stations: KITCHEN_STATIONS,
    floors: KITCHEN_FLOORS,
    ceilingCutY: KITCHEN_CEILING_CUT_Y,
    initialStationId: "human",
    initialMode: "inside",
    raycastFloor: (x, y) => raycastRef.current?.(x, y) ?? null,
  });

  const measure = useHybridMeasureTool({
    persistKey: "kitchen-proof:m",
    epochId: "kitchen",
    modelId: null,
    spaceId: null,
    metricAvailable: true,
  });

  const consumeTap = useCallback(
    (x: number, y: number) => {
      if (!measure.active) return false;
      const hit = metricRef.current?.(x, y);
      if (hit) measure.addPoint(hit.point);
      return true;
    },
    [measure],
  );
  const { fovRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleWheel } =
    useViewerGestures(nav, { consumeTap, onHover: (x, y) => measure.setHover(metricRef.current?.(x, y)?.point ?? null) });

  useEffect(() => {
    fovRef.current = KITCHEN_HUMAN_FOV;
  }, [fovRef]);

  useEffect(() => {
    setMeshOpacity(layer === "hybrid" ? 0.28 : 1);
  }, [layer]);

  useEffect(() => {
    const api: ProofApi = {
      setLayer,
      setView: nav.setMode,
      goStation: nav.goToStationId,
      toggleMeasure: measure.toggle,
      layer: () => layer,
      fps: () => fpsRef.current,
      timings: () => loadRef.current,
    };
    (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof = api;
    return () => {
      delete (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof;
    };
  }, [layer, nav, measure.toggle]);

  const showSplat = splatVisibleFor(layer);
  const meshDisplay = meshDisplayFor(layer);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--background)]" data-app="twin360">
      <div
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <Canvas
          camera={{ fov: KITCHEN_HUMAN_FOV, near: 0.08, far: 80 }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
            gl.localClippingEnabled = true;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <hemisphereLight
            intensity={0.85}
            color={cssColor("--muted-foreground", MESH_SURFACE_FALLBACK)}
            groundColor={cssColor("--graphite-canvas", MESH_GROUND_FALLBACK)}
          />
          <directionalLight intensity={0.32} position={[4, 7, 2]} />
          <ambientLight intensity={0.28} />
          <Suspense fallback={null}>
            <MeshBody
              url={meshUrl}
              ceilingCutY={KITCHEN_CEILING_CUT_Y}
              ceilingState={nav.mode === "inside" ? "closed" : "open"}
              display={meshDisplay}
              appearance={{
                opacity: layer === "hybrid" ? meshOpacity : 1,
                finish: "architectural",
              }}
            />
            {splatUrl ? (
              <MeshSplatLayer url={splatUrl} visible={showSplat} sparkPiFlip={false} />
            ) : null}
          </Suspense>
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
            onFloorHit={(fn) => {
              raycastRef.current = fn;
            }}
            onMetricHit={(fn) => {
              metricRef.current = fn;
            }}
          />
          <FpsProbe fpsRef={fpsRef} />
        </Canvas>
      </div>
      <HybridMeasureHud tool={measure} metricAvailable />
      <KitchenProofHud
        layer={layer}
        onLayer={setLayer}
        meshOpacity={meshOpacity}
        onMeshOpacity={setMeshOpacity}
        viewMode={nav.mode}
        onViewMode={nav.setMode}
        measureActive={measure.active}
        onToggleMeasure={measure.toggle}
      />
    </div>
  );
}
