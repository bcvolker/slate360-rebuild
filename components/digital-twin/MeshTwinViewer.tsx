"use client";

/**
 * Matterport-style walkthrough for the TSDF/LiDAR mesh, with an optional Spark
 * splat look layer. V0.1 hybrid modes (Reality / Hybrid / Geometry) map onto
 * the existing mesh/splat/both toggle. Measurement and pins raycast the metric
 * mesh even when it is hidden under the Gaussian Reality view.
 *
 * Splat-only twins (no LiDAR mesh) pass `meshUrl: null`: the splat is the only
 * look layer, click-to-walk lands on an invisible floor plane at the sidecar
 * floor elevation, and measure/pins stay disabled because nothing is metric.
 */

import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ReactElement } from "react";
import * as THREE from "three";

import { MeshBody, type CeilingState } from "@/components/digital-twin/mesh-body";
import { MeshSplatLayer } from "@/components/digital-twin/MeshSplatLayer";
import { SplatLoadingOverlay } from "@/components/digital-twin/splat-viewer-loading-overlay";
import { useViewerGestures, DEFAULT_FOV } from "@/components/digital-twin/use-viewer-gestures";
import { WalkFloorPlane } from "@/components/digital-twin/walk-floor-plane";
import { WalkthroughControls } from "@/components/digital-twin/WalkthroughControls";
import type { TwinLayerMode } from "@/components/digital-twin/WalkthroughLayerToggle";
import { NavigationRig, StationMarkers, type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { HybridDiagnostics } from "@/components/digital-twin/hybrid/HybridDiagnostics";
import { HybridEpochSelector } from "@/components/digital-twin/hybrid/HybridEpochSelector";
import { HybridMeasureHud } from "@/components/digital-twin/hybrid/HybridMeasureHud";
import { HybridPinPanel } from "@/components/digital-twin/hybrid/HybridPinPanel";
import { HybridSceneOverlays } from "@/components/digital-twin/hybrid/HybridSceneOverlays";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useHybridPinTool } from "@/hooks/useHybridPinTool";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import {
  cssColor,
  MESH_GROUND_FALLBACK,
  MESH_SURFACE_FALLBACK,
} from "@/lib/digital-twin/css-color";
import { measurementRaycastTarget } from "@/lib/digital-twin/s360-world";
import {
  meshDisplayFor,
  representationFromLayer,
  splatVisibleFor,
  type TwinEpoch,
} from "@/lib/digital-twin/twin-epoch";
import type { FloorInfo, ViewMode, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

export type { CeilingState };

export type MeshTwinViewerProps = {
  /** LiDAR/TSDF mesh. Null for splat-only twins. */
  meshUrl: string | null;
  splatUrl?: string | null;
  ceilingCutY?: number | null;
  stations: WalkStation[];
  floors: FloorInfo[];
  caption?: string;
  persistKey?: string;
  spaceId?: string | null;
  modelId?: string | null;
  epochs?: TwinEpoch[];
  /** Opening view. Splat-only rooms read best from inside. */
  initialMode?: ViewMode;
  /** "share" hides operator-only chrome (epochs, diagnostics) for clients. */
  chrome?: "operator" | "share";
};

export function MeshTwinViewer({
  meshUrl,
  splatUrl,
  ceilingCutY,
  stations,
  floors,
  caption,
  persistKey = "preview",
  spaceId = null,
  modelId = null,
  epochs = [],
  initialMode,
  chrome = "operator",
}: MeshTwinViewerProps): ReactElement {
  const [ceilingState, setCeilingState] = useState<CeilingState>("open");
  const [layerMode, setLayerMode] = useState<TwinLayerMode>(splatUrl ? "splat" : "mesh");
  const [splatRequested, setSplatRequested] = useState(false);
  const [splatReady, setSplatReady] = useState(false);
  const [splatBytes, setSplatBytes] = useState<{ loaded: number; total: number | null }>({ loaded: 0, total: null });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [epochId, setEpochId] = useState(epochs[0]?.id ?? "current");
  const [diagOpen, setDiagOpen] = useState(false);
  const [meshOpacity, setMeshOpacity] = useState(1);
  const [wireframe, setWireframe] = useState(false);
  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const metricRef = useRef<((x: number, y: number) => MetricHit | null) | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const epoch = epochs.find((e) => e.id === epochId);
  const activeMesh = epoch?.metricMesh?.url ?? meshUrl ?? null;
  const activeSplat = epoch?.gaussian?.url ?? splatUrl ?? null;
  const representation = representationFromLayer(activeMesh ? layerMode : "splat");
  const showSplat = Boolean(activeSplat) && splatVisibleFor(representation);
  const metricAvailable = Boolean(activeMesh);
  const raycastTarget = measurementRaycastTarget(metricAvailable);
  const splatOnly = !activeMesh && Boolean(activeSplat);

  const measure = useHybridMeasureTool({ persistKey: `${persistKey}:m`, epochId, modelId, spaceId, metricAvailable });
  const pins = useHybridPinTool({ persistKey: `${persistKey}:p`, epochId, modelId, spaceId, metricAvailable });

  useEffect(() => {
    if (showSplat) setSplatRequested(true);
  }, [showSplat]);

  const nav = useWalkthroughNavigation({
    stations,
    floors,
    ceilingCutY,
    initialMode: initialMode ?? (splatOnly ? "inside" : "dollhouse"),
    raycastFloor: (x, y) => raycastRef.current?.(x, y) ?? null,
  });

  const consumeTap = useCallback(
    (x: number, y: number) => {
      if (!measure.active && !pins.active) return false;
      const hit = metricRef.current?.(x, y);
      if (!hit) return true;
      if (measure.active) measure.addPoint(hit.point);
      else pins.place(hit.point, hit.normal, hit.faceIndex);
      return true;
    },
    [measure, pins],
  );

  const onHover = useCallback(
    (x: number, y: number) => {
      if (!measure.active) return;
      measure.setHover(metricRef.current?.(x, y)?.point ?? null);
    },
    [measure],
  );

  const { fovRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleWheel } =
    useViewerGestures(nav, { consumeTap, onHover });

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

  const onSplatProgress = useCallback((loaded: number, total: number | null) => setSplatBytes({ loaded, total }), []);
  const onSplatLoaded = useCallback(() => setSplatReady(true), []);

  const registration = useMemo(
    () => epoch?.registration ?? { status: "unvalidated" as const, method: null, rmse: null, timestamp: null, version: null, sourceFrame: "TSDF_MESH" as const, toWorld: { matrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1], scale: 1 } },
    [epoch],
  );

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
          onCreated={({ gl }) => {
            gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
            gl.localClippingEnabled = true;
            gl.toneMapping = THREE.NoToneMapping;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <hemisphereLight
            intensity={0.55}
            color={cssColor("--muted-foreground", MESH_SURFACE_FALLBACK)}
            groundColor={cssColor("--graphite-canvas", MESH_GROUND_FALLBACK)}
          />
          <directionalLight intensity={0.9} position={[6, 10, 4]} />
          <ambientLight intensity={0.22} />
          <Suspense fallback={null}>
            {activeMesh ? (
              <MeshBody
                url={activeMesh}
                ceilingCutY={ceilingCutY}
                ceilingState={ceilingState}
                display={meshDisplayFor(representation)}
                appearance={{ opacity: meshOpacity, wireframe }}
              />
            ) : (
              <WalkFloorPlane stations={stations} floors={floors} floorIndex={nav.currentFloorIndex} />
            )}
            {activeSplat && splatRequested ? (
              <MeshSplatLayer
                url={activeSplat}
                visible={showSplat}
                ceilingCutY={splatOnly && nav.mode !== "inside" ? ceilingCutY : null}
                ceilingState={ceilingState}
                onProgress={onSplatProgress}
                onLoaded={onSplatLoaded}
              />
            ) : null}
          </Suspense>
          <HybridSceneOverlays
            measurements={measure.rows}
            pins={pins.pins}
            draftPoints={measure.draft}
            hover={measure.hover}
            showMeasurements
            showPins
          />
          <StationMarkers
            stations={stations}
            floors={floors}
            floorIndex={nav.currentFloorIndex}
            currentId={nav.currentStationId}
            visible={nav.mode !== "floorplan"}
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
        </Canvas>
      </div>

      {splatOnly && !splatReady ? (
        <SplatLoadingOverlay bytesLoaded={splatBytes.loaded} bytesTotal={splatBytes.total} />
      ) : null}

      {caption ? (
        <p className="pointer-events-none absolute bottom-28 left-4 max-w-[50%] font-mono text-[10px] uppercase leading-relaxed tracking-wide text-white/50">
          {caption}
        </p>
      ) : null}

      {chrome === "operator" ? (
        <>
          <HybridEpochSelector epochs={epochs} currentId={epochId} onChange={setEpochId} />
          <HybridDiagnostics
            open={diagOpen}
            onToggle={() => setDiagOpen((v) => !v)}
            representation={representation}
            raycastTarget={raycastTarget}
            registration={registration}
            meshOpacity={meshOpacity}
            onMeshOpacity={setMeshOpacity}
            wireframe={wireframe}
            onWireframe={setWireframe}
          />
        </>
      ) : null}
      {/* Clients see the measure/pin panels only when they can act on them or asked for them. */}
      {chrome === "operator" || metricAvailable || measure.active ? (
        <HybridMeasureHud tool={measure} metricAvailable={metricAvailable} />
      ) : null}
      {chrome === "operator" || metricAvailable || pins.active ? (
        <HybridPinPanel tool={pins} metricAvailable={metricAvailable} />
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
        layerMode={activeSplat && activeMesh ? layerMode : undefined}
        onLayerModeChange={activeSplat && activeMesh ? setLayerMode : undefined}
        measureActive={measure.active}
        onToggleMeasure={measure.toggle}
        pinActive={pins.active}
        onTogglePin={pins.toggle}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
