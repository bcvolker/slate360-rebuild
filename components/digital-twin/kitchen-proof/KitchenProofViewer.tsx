"use client";

/**
 * Kitchen spatial viewer shell: Geometry first, silent Reality, quiet chrome.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { KitchenAppearanceStatus } from "@/components/digital-twin/kitchen-proof/KitchenAppearanceStatus";
import { KitchenProofDebug } from "@/components/digital-twin/kitchen-proof/KitchenProofDebug";
import { KitchenProofLoader } from "@/components/digital-twin/kitchen-proof/KitchenProofLoader";
import { KitchenProofScene } from "@/components/digital-twin/kitchen-proof/KitchenProofScene";
import { KitchenViewerChrome, type KitchenChromeApi } from "@/components/digital-twin/kitchen-proof/KitchenViewerChrome";
import "@/components/digital-twin/kitchen-proof/kitchen-viewer-chrome.css";
import { type ProofApi } from "@/components/digital-twin/kitchen-proof/kitchen-proof-api";
import { type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { HybridMeasureHud } from "@/components/digital-twin/hybrid/HybridMeasureHud";
import { useViewerGestures } from "@/components/digital-twin/use-viewer-gestures";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useKitchenAppearanceGate } from "@/hooks/useKitchenAppearanceGate";
import { useKitchenGlb } from "@/hooks/useKitchenGlb";
import { useKitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import { poseDelta } from "@/lib/digital-twin/kitchen-capsule";
import {
  KITCHEN_CEILING_CUT_Y,
  KITCHEN_DEFAULT_STATION,
  KITCHEN_FLOORS,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
  kitchenDefaultStation,
  kitchenEyeY,
} from "@/lib/digital-twin/kitchen-proof-world";

function heapMb(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize / 1e6 : null;
}

export function KitchenProofViewer({
  displayUrl,
  navUrl,
  measureUrl,
  appearanceUrl = null,
  thumbnailUrl = null,
  debug = false,
}: {
  displayUrl: string;
  navUrl: string;
  measureUrl: string;
  appearanceUrl?: string | null;
  thumbnailUrl?: string | null;
  debug?: boolean;
}): ReactElement {
  const display = useKitchenGlb(displayUrl);
  const navMesh = useKitchenGlb(navUrl);
  const [wantMeasure, setWantMeasure] = useState(false);
  const measureGlb = useKitchenGlb(wantMeasure ? measureUrl : null);
  const [splatReady, setSplatReady] = useState(false);
  const [walkEnabled, setWalkEnabled] = useState(true);
  const [hoverWalk, setHoverWalk] = useState(false);
  const appearance = useKitchenAppearanceGate(splatReady, appearanceUrl);
  const fpsRef = useRef(0);
  const infoRef = useRef<number | null>(null);
  const chromeRef = useRef<KitchenChromeApi | null>(null);
  const firstUsefulMs = useRef(performance.now());
  const geometryReadyMs = useRef<number | null>(null);
  const appearanceReadyMs = useRef<number | null>(null);
  const splatStatsRef = useRef<{ loaded: number; numSh: number } | null>(null);
  const appearanceStarted = useRef(performance.now());
  const home = kitchenDefaultStation();
  const loco = useKitchenLocomotion({
    x: home.position[0],
    y: kitchenEyeY(),
    z: home.position[2],
    yaw: home.headingY ?? 0,
    pitch: 0,
  });

  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const metricRef = useRef<((x: number, y: number) => MetricHit | null) | null>(null);

  const nav = useWalkthroughNavigation({
    stations: KITCHEN_STATIONS,
    floors: KITCHEN_FLOORS,
    ceilingCutY: KITCHEN_CEILING_CUT_Y,
    initialStationId: KITCHEN_DEFAULT_STATION,
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

  const consumeTap = useCallback(
    (x: number, y: number) => {
      if (measure.active) {
        const hit = metricRef.current?.(x, y);
        if (hit) measure.addPoint(hit.point);
        return true;
      }
      if (nav.mode !== "inside" || !walkEnabled) return false;
      const hit = raycastRef.current?.(x, y);
      if (hit) loco.walkTo(hit[0], hit[2]);
      return true;
    },
    [loco, measure, nav.mode, walkEnabled],
  );

  const patchedNav = useMemo(
    () => ({
      ...nav,
      handleLookDrag: (dx: number, dy: number) => {
        nav.handleLookDrag(dx, dy);
        if (nav.mode === "inside") loco.handleLook(dx, dy);
      },
    }),
    [nav, loco],
  );

  const { fovRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleWheel } =
    useViewerGestures(patchedNav, {
      consumeTap,
      onHover: (x, y) => {
        measure.setHover(metricRef.current?.(x, y)?.point ?? null);
        setHoverWalk(Boolean(walkEnabled && !measure.active && raycastRef.current?.(x, y)));
      },
    });

  useEffect(() => {
    fovRef.current = KITCHEN_HUMAN_FOV;
  }, [fovRef]);

  useEffect(() => {
    if (measure.active) setWantMeasure(true);
  }, [measure.active]);

  useEffect(() => {
    if (display.status === "ready" && geometryReadyMs.current == null) {
      geometryReadyMs.current = performance.now();
    }
  }, [display.status]);

  const onAppearanceReady = useCallback((stats?: { loaded: number; numSh: number }) => {
    if (appearanceReadyMs.current == null) appearanceReadyMs.current = performance.now();
    if (stats) splatStatsRef.current = stats;
    setSplatReady(true);
  }, []);

  useEffect(() => {
    const api: ProofApi = {
      setLayer: appearance.requestLayer,
      setView: nav.setMode,
      goStation,
      walkToStation: (id) => {
        const station = KITCHEN_STATIONS.find((s) => s.id === id);
        if (station) loco.walkTo(station.position[0], station.position[2]);
      },
      toggleMeasure: measure.toggle,
      resetView: () => {
        loco.reset();
        goStation(KITCHEN_DEFAULT_STATION);
      },
      layer: () => appearance.layer,
      fps: () => fpsRef.current,
      appearanceReady: () => splatReady,
      splatStats: () => splatStatsRef.current,
      pose: () => ({ ...loco.poseRef.current }),
      poseJump: (other) => poseDelta(loco.poseRef.current, other),
      openViewMenu: () => chromeRef.current?.setViewOpen(true),
      closeMenus: () => chromeRef.current?.closeMenus(),
      setChromeIdle: (value) => chromeRef.current?.setIdle(value),
      timings: () => ({
        displayMs: display.loadMs,
        navMs: navMesh.loadMs,
        appearanceMs:
          appearanceReadyMs.current == null ? null : appearanceReadyMs.current - appearanceStarted.current,
        firstUsefulMs: firstUsefulMs.current,
        geometryReadyMs: geometryReadyMs.current,
        appearanceReadyMs: appearanceReadyMs.current,
        memoryMb: heapMb(),
      }),
    };
    (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof = api;
    return () => {
      delete (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof;
    };
  }, [appearance.layer, appearance.requestLayer, display.loadMs, goStation, loco, measure.toggle, nav.setMode, navMesh.loadMs, splatReady]);

  const ready = display.status === "ready" && Boolean(display.geometry);
  const cursor = measure.active ? "crosshair" : hoverWalk ? "pointer" : "grab";

  return (
    <div className="kv-shell relative h-full w-full overflow-hidden" data-app="twin360">
      <KitchenProofLoader thumbnailUrl={thumbnailUrl} geometryReady={ready} error={display.error} />
      <div
        className="h-full w-full touch-none"
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <KitchenProofScene
          displayGeometry={display.geometry}
          navGeometry={navMesh.geometry}
          measureGeometry={measureGlb.geometry}
          appearanceUrl={appearanceUrl}
          appearanceKey={appearance.retryKey}
          layer={appearance.layer}
          splatReady={splatReady}
          onAppearanceReady={onAppearanceReady}
          nav={nav}
          loco={loco}
          fovRef={fovRef}
          fpsRef={fpsRef}
          infoRef={infoRef}
          raycastRef={raycastRef}
          metricRef={metricRef}
          measure={measure}
        />
      </div>
      <KitchenAppearanceStatus
        preparing={appearance.preparing}
        timedOut={appearance.timedOut}
        onRetry={() => {
          setSplatReady(false);
          appearance.retryAppearance();
        }}
      />
      <HybridMeasureHud tool={measure} metricAvailable />
      <KitchenViewerChrome
        layer={appearance.layer}
        viewMode={nav.mode}
        measureActive={measure.active}
        onLayer={appearance.requestLayer}
        onViewMode={nav.setMode}
        onToggleMeasure={measure.toggle}
        onReset={() => goStation(KITCHEN_DEFAULT_STATION)}
        walkEnabled={walkEnabled}
        onToggleMove={() => setWalkEnabled((v) => !v)}
        onApi={(api) => {
          chromeRef.current = api;
        }}
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
            appearanceReady: splatReady,
            dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
            drawCalls: infoRef.current,
          }}
        />
      ) : null}
    </div>
  );
}
