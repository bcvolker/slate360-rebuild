"use client";

/**
 * Kitchen delivery viewer: staged GLB, nav-only collision, no fake Gaussians.
 */

import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import * as THREE from "three";

import { KitchenLocomotionRig } from "@/components/digital-twin/kitchen-proof/KitchenLocomotionRig";
import { KitchenMeshLayer } from "@/components/digital-twin/kitchen-proof/KitchenMeshLayer";
import { KitchenProofDebug } from "@/components/digital-twin/kitchen-proof/KitchenProofDebug";
import { KitchenProofHud } from "@/components/digital-twin/kitchen-proof/KitchenProofHud";
import { KitchenProofLoader } from "@/components/digital-twin/kitchen-proof/KitchenProofLoader";
import { FpsProbe, type ProofApi } from "@/components/digital-twin/kitchen-proof/kitchen-proof-api";
import { NavigationRig, type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { HybridMeasureHud } from "@/components/digital-twin/hybrid/HybridMeasureHud";
import { HybridSceneOverlays } from "@/components/digital-twin/hybrid/HybridSceneOverlays";
import { useViewerGestures } from "@/components/digital-twin/use-viewer-gestures";
import { useAppearanceProbe } from "@/hooks/useAppearanceProbe";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useKitchenGlb } from "@/hooks/useKitchenGlb";
import { useKitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import { useTwinDeliveryProfile } from "@/hooks/useTwinDeliveryProfile";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import { cssColor, MESH_GROUND_FALLBACK, MESH_SURFACE_FALLBACK } from "@/lib/digital-twin/css-color";
import { poseDelta } from "@/lib/digital-twin/kitchen-capsule";
import {
  KITCHEN_APPEARANCE_AVAILABLE,
  KITCHEN_CEILING_CUT_Y,
  KITCHEN_FLOORS,
  KITCHEN_FLOOR_Y,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
  kitchenEyeY,
} from "@/lib/digital-twin/kitchen-proof-world";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export function KitchenProofViewer({
  displayUrl,
  navUrl,
  measureUrl,
  thumbnailUrl,
  appearanceUrl,
  debug = false,
}: {
  displayUrl: string;
  navUrl: string;
  measureUrl: string;
  thumbnailUrl: string | null;
  appearanceUrl: string | null;
  debug?: boolean;
}): ReactElement {
  const profile = useTwinDeliveryProfile();
  const display = useKitchenGlb(displayUrl);
  const navMesh = useKitchenGlb(navUrl);
  const appearance = useAppearanceProbe(KITCHEN_APPEARANCE_AVAILABLE ? appearanceUrl : null);
  const [wantMeasure, setWantMeasure] = useState(false);
  const measureGlb = useKitchenGlb(wantMeasure && profile.allowMeasure ? measureUrl : null);
  const [layer, setLayer] = useState<TwinLayerRepresentation>("geometry");
  const fpsRef = useRef(0);
  const infoRef = useRef<number | null>(null);
  const human = KITCHEN_STATIONS[0];
  const loco = useKitchenLocomotion({
    x: human.position[0],
    y: kitchenEyeY(),
    z: human.position[2],
    yaw: human.headingY ?? 0,
    pitch: 0,
  });

  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const metricRef = useRef<((x: number, y: number) => MetricHit | null) | null>(null);

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

  const goStation = useCallback(
    (id: string) => {
      const station = KITCHEN_STATIONS.find((s) => s.id === id);
      if (!station) return;
      loco.targetRef.current = null;
      loco.setPose({
        x: station.position[0],
        y: kitchenEyeY(),
        z: station.position[2],
        yaw: station.headingY ?? loco.poseRef.current.yaw,
        pitch: 0,
      });
      nav.goToStationId(id);
    },
    [loco, nav],
  );

  const resetView = useCallback(() => {
    loco.reset();
    goStation("island");
  }, [goStation, loco]);

  const consumeTap = useCallback(
    (x: number, y: number) => {
      if (measure.active) {
        const hit = metricRef.current?.(x, y);
        if (hit) measure.addPoint(hit.point);
        return true;
      }
      if (nav.mode !== "inside") return false;
      const hit = raycastRef.current?.(x, y);
      if (hit) loco.walkTo(hit[0], hit[2]);
      return true;
    },
    [loco, measure, nav.mode],
  );

  const patchedNav = useMemo(
    () => ({
      ...nav,
      handleLookDrag: (dx: number, dy: number) => {
        nav.handleLookDrag(dx, dy);
        if (nav.mode === "inside") loco.handleLook(dx, dy);
      },
      setMode: (mode: typeof nav.mode) => {
        if (profile.allowDollhouse || mode === "inside") nav.setMode(mode);
      },
    }),
    [nav, loco, profile.allowDollhouse],
  );

  const { fovRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleWheel } =
    useViewerGestures(patchedNav, { consumeTap, onHover: (x, y) => measure.setHover(metricRef.current?.(x, y)?.point ?? null) });

  useEffect(() => {
    fovRef.current = KITCHEN_HUMAN_FOV;
  }, [fovRef]);

  useEffect(() => {
    if (measure.active && profile.allowMeasure) setWantMeasure(true);
  }, [measure.active, profile.allowMeasure]);

  useEffect(() => {
    if (display.status === "ready") performance.mark("twin-geometry-ready");
  }, [display.status]);

  const appearanceOk = KITCHEN_APPEARANCE_AVAILABLE && appearance.status === "ready";
  const setLayerSafe = useCallback((next: TwinLayerRepresentation) => {
    if ((next === "hybrid" || next === "reality") && !appearanceOk) {
      setLayer(next === "reality" ? "reality" : "geometry");
      return;
    }
    setLayer(next);
  }, [appearanceOk]);

  useEffect(() => {
    const api: ProofApi = {
      setLayer: setLayerSafe,
      setView: patchedNav.setMode,
      goStation,
      toggleMeasure: measure.toggle,
      resetView,
      layer: () => layer,
      fps: () => fpsRef.current,
      pose: () => ({ ...loco.poseRef.current }),
      poseJump: (other) => poseDelta(loco.poseRef.current, other),
      timings: () => ({
        displayMs: display.loadMs,
        navMs: navMesh.loadMs,
        appearanceMs: appearance.ms,
        appearanceStatus: appearance.status,
      }),
      delivery: () => ({
        displayRole: "display",
        navCollisionOnly: true,
        measureDeferred: !wantMeasure,
      }),
    };
    (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof = api;
    return () => {
      delete (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof;
    };
  }, [appearance.ms, appearance.status, display.loadMs, goStation, layer, loco, measure.toggle, navMesh.loadMs, patchedNav.setMode, resetView, setLayerSafe, wantMeasure]);

  const ready = display.status === "ready" && display.geometry;
  const appearanceMissing = !appearanceOk;
  const showGeometry = layer === "geometry" || layer === "hybrid" || (layer === "reality" && appearanceMissing);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--background)]" data-app="twin360">
      {!ready ? (
        <KitchenProofLoader
          thumbnailUrl={thumbnailUrl}
          geometryLabel={display.error ?? "geometry-display"}
          geometryProgress={display.progress}
          navLabel={navMesh.error ?? (navMesh.status === "ready" ? "ready" : "geometry-nav")}
          error={display.error}
        />
      ) : null}
      <div
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <Canvas
          camera={{ fov: KITCHEN_HUMAN_FOV, near: 0.06, far: 60 }}
          dpr={profile.dpr}
          gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
            gl.toneMapping = THREE.NoToneMapping;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            infoRef.current = gl.info.render.calls;
          }}
        >
          <hemisphereLight intensity={0.9} color={cssColor("--muted-foreground", MESH_SURFACE_FALLBACK)} groundColor={cssColor("--graphite-canvas", MESH_GROUND_FALLBACK)} />
          {profile.mobile ? null : <directionalLight intensity={0.28} position={[3.5, 6.5, 2]} />}
          <ambientLight intensity={profile.mobile ? 0.5 : 0.32} />
          {display.geometry ? (
            <KitchenMeshLayer geometry={display.geometry} role="display" visible={showGeometry} opacity={layer === "hybrid" ? 0.16 : 1} />
          ) : null}
          {navMesh.geometry ? <KitchenMeshLayer geometry={navMesh.geometry} role="nav" collisionOnly /> : null}
          {measureGlb.geometry ? <KitchenMeshLayer geometry={measureGlb.geometry} role="measure" collisionOnly /> : null}
          <HybridSceneOverlays measurements={measure.rows} pins={[]} draftPoints={measure.draft} hover={measure.hover} showMeasurements={measure.active || measure.rows.length > 0} showPins={false} />
          <NavigationRig nav={nav} fovRef={fovRef} driveCamera={nav.mode !== "inside"} onFloorHit={(fn) => { raycastRef.current = fn; }} onMetricHit={(fn) => { metricRef.current = fn; }} />
          <KitchenLocomotionRig loco={loco} nav={nav} fovRef={fovRef} floorY={KITCHEN_FLOOR_Y} ceilingY={KITCHEN_CEILING_CUT_Y} enabled={nav.mode === "inside"} />
          <FpsProbe fpsRef={fpsRef} />
        </Canvas>
      </div>
      {layer === "reality" && appearanceMissing ? (
        <p data-testid="appearance-unavailable" className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-xl border border-white/10 bg-black/55 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-white/80">
          Appearance asset unavailable
        </p>
      ) : null}
      {profile.allowMeasure ? <HybridMeasureHud tool={measure} metricAvailable /> : null}
      <KitchenProofHud
        layer={layer}
        onLayer={setLayerSafe}
        appearanceAvailable={appearanceOk}
        viewMode={nav.mode}
        onViewMode={patchedNav.setMode}
        measureActive={measure.active}
        onToggleMeasure={measure.toggle}
        onReset={resetView}
        compact={profile.mobile}
      />
      {debug ? (
        <KitchenProofDebug
          stats={{
            displayMb: display.bytes / 1e6,
            displayTris: display.triangles,
            displayLoadMs: display.loadMs,
            displayFps: fpsRef.current,
            navMb: navMesh.bytes / 1e6,
            navTris: navMesh.triangles,
            navLoadMs: navMesh.loadMs,
            measureMb: measureGlb.bytes / 1e6,
            measureTris: measureGlb.triangles,
            dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
            drawCalls: infoRef.current,
          }}
        />
      ) : null}
    </div>
  );
}
