"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { KitchenProofLoader } from "@/components/digital-twin/kitchen-proof/KitchenProofLoader";
import { KitchenProofOverlays } from "@/components/digital-twin/kitchen-proof/KitchenProofOverlays";
import { KitchenProofScene } from "@/components/digital-twin/kitchen-proof/KitchenProofScene";
import { type KitchenChromeApi } from "@/components/digital-twin/kitchen-proof/KitchenViewerChrome";
import "@/components/digital-twin/kitchen-proof/kitchen-viewer-chrome.css";
import { useViewerGestures } from "@/components/digital-twin/use-viewer-gestures";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useKitchenAppearanceFetch } from "@/hooks/useKitchenAppearanceFetch";
import { useKitchenAppearanceGate } from "@/hooks/useKitchenAppearanceGate";
import { useKitchenGlb } from "@/hooks/useKitchenGlb";
import { useKitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import { kitchenProofApi, useKitchenProofWindow } from "@/hooks/useKitchenProofWindow";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import { poseDelta } from "@/lib/digital-twin/kitchen-capsule";
import { appearanceStatusCopy, spatialPhase } from "@/lib/digital-twin/asset-progress";
import {
  KITCHEN_CEILING_CUT_Y,
  KITCHEN_DEFAULT_STATION,
  KITCHEN_FLOORS,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
  kitchenDefaultStation,
  kitchenEyeY,
} from "@/lib/digital-twin/kitchen-proof-world";
import { type MetricHit } from "@/components/digital-twin/walkthrough-rig";

export function KitchenProofViewer({
  displayUrl,
  navUrl,
  measureUrl,
  appearanceUrl = null,
  heroUrl = "/monday-release/kitchen-hero.png",
  failAppearance = false,
  debug = false,
}: {
  displayUrl: string;
  navUrl: string;
  measureUrl: string;
  appearanceUrl?: string | null;
  heroUrl?: string | null;
  failAppearance?: boolean;
  debug?: boolean;
}): ReactElement {
  const display = useKitchenGlb(displayUrl);
  const navMesh = useKitchenGlb(navUrl);
  const appearanceAsset = useKitchenAppearanceFetch(appearanceUrl, failAppearance);
  const [wantMeasure, setWantMeasure] = useState(false);
  const measureGlb = useKitchenGlb(wantMeasure ? measureUrl : null);
  const [splatReady, setSplatReady] = useState(false);
  const [walkEnabled, setWalkEnabled] = useState(true);
  const [hoverWalk, setHoverWalk] = useState(false);
  const [hint, setHint] = useState(true);
  const [panoReady, setPanoReady] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const appearance = useKitchenAppearanceGate(splatReady, appearanceAsset.objectUrl);
  const fpsRef = useRef(0);
  const infoRef = useRef<number | null>(null);
  const chromeRef = useRef<KitchenChromeApi | null>(null);
  const boot = useRef(performance.now());
  const firstUsefulMs = useRef<number | null>(null);
  const geometryReadyMs = useRef<number | null>(null);
  const appearanceReadyMs = useRef<number | null>(null);
  const splatStatsRef = useRef<{ loaded: number; numSh: number } | null>(null);
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
      setHint(false);
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
        setHint(false);
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
    if (measure.active) setWantMeasure(true);
    if (display.status === "ready" && geometryReadyMs.current == null) {
      geometryReadyMs.current = performance.now();
    }
  }, [fovRef, measure.active, display.status]);

  const onAppearanceReady = useCallback((stats?: { loaded: number; numSh: number }) => {
    if (appearanceReadyMs.current == null) appearanceReadyMs.current = performance.now();
    if (stats) splatStatsRef.current = stats;
    setSplatReady(true);
  }, []);

  const ready = display.status === "ready" && Boolean(display.geometry);
  const phase = spatialPhase({
    panoramaReady: panoReady,
    geometryReady: ready,
    realityReady: splatReady,
    geometryFailed: display.status === "error",
    realityFailed: appearanceAsset.failed,
    webglLost,
  });
  const status = splatReady
    ? null
    : appearanceStatusCopy(appearanceAsset) ??
      (appearance.preparing ? { message: "Reality is still loading", retry: false } : null);

  const api = kitchenProofApi({
    requestLayer: appearance.requestLayer,
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
    layer: appearance.layer,
    fps: () => fpsRef.current,
    appearanceReady: () => splatReady,
    splatStats: () => splatStatsRef.current,
    pose: () => ({ ...loco.poseRef.current }),
    poseJump: (other) => poseDelta(loco.poseRef.current, other),
    chromeRef,
    timings: () => ({
      displayMs: display.loadMs,
      navMs: navMesh.loadMs,
      appearanceMs: appearanceReadyMs.current == null ? null : appearanceReadyMs.current - boot.current,
      firstUsefulMs: firstUsefulMs.current,
      geometryReadyMs: geometryReadyMs.current,
      appearanceReadyMs: appearanceReadyMs.current,
      memoryMb: null,
    }),
  });
  useKitchenProofWindow(api);

  const cursor = measure.active ? "crosshair" : hoverWalk ? "pointer" : "grab";

  return (
    <div
      className="kv-shell relative h-full w-full overflow-hidden"
      data-app="twin360"
      data-spatial-phase={phase}
    >
      <KitchenProofLoader
        heroUrl={heroUrl}
        geometryReady={ready}
        error={display.error}
        onHeroReady={() => {
          if (firstUsefulMs.current == null) firstUsefulMs.current = performance.now() - boot.current;
          setPanoReady(true);
        }}
      />
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
          appearanceUrl={appearanceAsset.objectUrl}
          appearanceKey={appearance.retryKey}
          layer={appearance.layer}
          splatReady={splatReady}
          onAppearanceReady={onAppearanceReady}
          onContextLost={() => setWebglLost(true)}
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
      <KitchenProofOverlays
        hint={hint && ready}
        onHintUsed={() => setHint(false)}
        webglLost={webglLost}
        status={status}
        onRetry={() => {
          setSplatReady(false);
          appearanceAsset.retry();
          appearance.retryAppearance();
        }}
        measure={measure}
        layer={appearance.layer}
        viewMode={nav.mode}
        onLayer={appearance.requestLayer}
        onViewMode={nav.setMode}
        onToggleMeasure={measure.toggle}
        onReset={() => goStation(KITCHEN_DEFAULT_STATION)}
        walkEnabled={walkEnabled}
        onToggleMove={() => setWalkEnabled((v) => !v)}
        stations={KITCHEN_STATIONS}
        currentStationId={nav.currentStationId}
        onStation={goStation}
        onChromeApi={(next) => {
          chromeRef.current = next;
        }}
        debug={debug}
        debugStats={{
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
    </div>
  );
}
