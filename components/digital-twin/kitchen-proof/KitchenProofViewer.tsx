"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import { KitchenProofLoader } from "@/components/digital-twin/kitchen-proof/KitchenProofLoader";
import { KitchenProofOverlays } from "@/components/digital-twin/kitchen-proof/KitchenProofOverlays";
import { KitchenProofScene } from "@/components/digital-twin/kitchen-proof/KitchenProofScene";
import { type KitchenChromeApi } from "@/components/digital-twin/kitchen-proof/KitchenViewerChrome";
import "@/components/digital-twin/kitchen-proof/kitchen-viewer-chrome.css";
import { useKitchenAppearanceGate } from "@/hooks/useKitchenAppearanceGate";
import { useKitchenGlb } from "@/hooks/useKitchenGlb";
import { useKitchenProofShell } from "@/hooks/useKitchenProofShell";
import { kitchenProofApi, useKitchenProofWindow } from "@/hooks/useKitchenProofWindow";
import { poseDelta } from "@/lib/digital-twin/kitchen-capsule";
import { absoluteSameOriginUrl, spatialPhase } from "@/lib/digital-twin/asset-progress";
import { type PixelProbe, type VisibleLayer } from "@/lib/digital-twin/scene-visibility";

export function KitchenProofViewer({
  displayUrl,
  navUrl,
  measureUrl,
  appearanceUrl = null,
  heroUrl = null,
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
  const appearanceSrc = failAppearance || !appearanceUrl ? null : absoluteSameOriginUrl(appearanceUrl);
  const shell = useKitchenProofShell();
  const measureGlb = useKitchenGlb(shell.wantMeasure ? measureUrl : null);
  const [splatAssetReady, setSplatAssetReady] = useState(false);
  const [geometryPixels, setGeometryPixels] = useState(false);
  const [realityPixels, setRealityPixels] = useState(false);
  const [realityFailed, setRealityFailed] = useState(failAppearance);
  const [probeLayer, setProbeLayer] = useState<VisibleLayer | null>(null);
  const [panoReady, setPanoReady] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const appearance = useKitchenAppearanceGate(realityPixels, appearanceSrc);
  const fpsRef = useRef(0);
  const infoRef = useRef<number | null>(null);
  const chromeRef = useRef<KitchenChromeApi | null>(null);
  const boot = useRef(performance.now());
  const firstUsefulMs = useRef<number | null>(null);
  const geometryReadyMs = useRef<number | null>(null);
  const appearanceReadyMs = useRef<number | null>(null);
  const splatStatsRef = useRef<{ loaded: number; numSh: number } | null>(null);
  const geoAttempts = useRef(0);

  useEffect(() => {
    shell.gestures.fovRef.current = shell.humanFov;
    if (shell.measure.active) shell.setWantMeasure(true);
  }, [shell.gestures.fovRef, shell.humanFov, shell.measure.active, shell.setWantMeasure]);

  useEffect(() => {
    if (display.status !== "ready" || !display.geometry || geometryPixels || geoAttempts.current >= 2) return;
    const t = window.setTimeout(() => setProbeLayer("geometry"), 120);
    return () => window.clearTimeout(t);
  }, [display.status, display.geometry, geometryPixels]);

  useEffect(() => {
    if (!splatAssetReady || realityPixels || realityFailed) return;
    const hold = window.setTimeout(() => setProbeLayer("reality"), 90);
    return () => window.clearTimeout(hold);
  }, [splatAssetReady, realityPixels, realityFailed]);

  const onAppearanceReady = useCallback((stats?: { loaded: number; numSh: number }) => {
    if (appearanceReadyMs.current == null) appearanceReadyMs.current = performance.now();
    if (stats) splatStatsRef.current = stats;
    if (!stats?.loaded) {
      setRealityFailed(true);
      return;
    }
    setSplatAssetReady(true);
  }, []);

  const onProbe = useCallback((layer: VisibleLayer, probe: PixelProbe) => {
    const now = performance.now();
    console.info("[twin-vis]", {
      layerRequested: layer,
      assetLoaded: layer === "reality" ? splatAssetReady : display.status === "ready",
      objectCount: layer === "reality" ? splatStatsRef.current?.loaded ?? 0 : display.triangles,
      cameraPosition: [shell.loco.poseRef.current.x, shell.loco.poseRef.current.y, shell.loco.poseRef.current.z],
      visibleObjectCount: probe.visible ? 1 : 0,
      nonBackgroundPixelRatio: probe.nonBackgroundPixelRatio,
      frameVariance: probe.frameVariance,
      firstVisibleFrameMs: probe.visible ? now - boot.current : null,
    });
    setProbeLayer(null);
    if (layer === "geometry") {
      geoAttempts.current += 1;
      if (probe.visible) {
        if (geometryReadyMs.current == null) geometryReadyMs.current = now;
        setGeometryPixels(true);
      }
      return;
    }
    if (probe.visible) setRealityPixels(true);
    else setRealityFailed(true);
  }, [display.status, display.triangles, shell.loco.poseRef, splatAssetReady]);

  const committed: VisibleLayer = realityPixels ? "reality" : geometryPixels ? "geometry" : "hero";
  const showGeometry = committed !== "reality" && probeLayer !== "reality";
  const showSplat = Boolean(appearanceSrc) && splatAssetReady && (committed === "reality" || probeLayer === "reality");
  const meshReady = display.status === "ready" && Boolean(display.geometry);
  const phase = spatialPhase({
    panoramaReady: panoReady,
    geometryReady: geometryPixels,
    realityReady: realityPixels,
    geometryFailed: display.status === "error",
    realityFailed,
    webglLost,
  });
  const status = realityPixels
    ? null
    : realityFailed
      ? { message: "Reality unavailable — Geometry remains available", retry: true }
      : appearance.preparing
        ? { message: "Reality is still loading", retry: false }
        : null;

  const api = kitchenProofApi({
    requestLayer: appearance.requestLayer,
    setView: shell.nav.setMode,
    goStation: shell.goStation,
    walkToStation: (id) => {
      const station = shell.stations.find((s) => s.id === id);
      if (station) shell.loco.walkTo(station.position[0], station.position[2]);
    },
    toggleMeasure: shell.measure.toggle,
    resetView: () => {
      shell.loco.reset();
      shell.goStation(shell.defaultStation);
    },
    layer: appearance.layer,
    fps: () => fpsRef.current,
    appearanceReady: () => realityPixels,
    splatStats: () => splatStatsRef.current,
    pose: () => ({ ...shell.loco.poseRef.current }),
    poseJump: (other) => poseDelta(shell.loco.poseRef.current, other),
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

  const g = shell.gestures;
  const cursor = shell.measure.active ? "crosshair" : shell.hoverWalk ? "pointer" : "grab";

  return (
    <div
      className="kv-shell relative h-full w-full overflow-hidden"
      data-app="twin360"
      data-spatial-phase={phase}
      data-scene-visible={geometryPixels || panoReady ? "true" : "false"}
      data-visible-layer={committed}
    >
      <KitchenProofLoader
        heroUrl={heroUrl}
        cover={committed === "hero"}
        error={display.error}
        onHeroReady={() => {
          if (firstUsefulMs.current == null) firstUsefulMs.current = performance.now() - boot.current;
          setPanoReady(true);
        }}
      />
      <div
        className="h-full w-full touch-none"
        style={{ cursor }}
        onPointerDown={g.handlePointerDown}
        onPointerMove={g.handlePointerMove}
        onPointerUp={g.handlePointerUp}
        onPointerCancel={g.handlePointerCancel}
        onWheel={g.handleWheel}
      >
        <KitchenProofScene
          displayGeometry={display.geometry}
          navGeometry={navMesh.geometry}
          measureGeometry={measureGlb.geometry}
          appearanceUrl={appearanceSrc}
          appearanceKey={appearance.retryKey}
          layer={appearance.layer}
          splatReady={realityPixels}
          showGeometry={showGeometry}
          showSplat={showSplat}
          probeLayer={probeLayer}
          onProbe={onProbe}
          onAppearanceReady={onAppearanceReady}
          onContextLost={() => setWebglLost(true)}
          nav={shell.nav}
          loco={shell.loco}
          fovRef={g.fovRef}
          fpsRef={fpsRef}
          infoRef={infoRef}
          raycastRef={shell.raycastRef}
          metricRef={shell.metricRef}
          measure={shell.measure}
        />
      </div>
      <KitchenProofOverlays
        hint={shell.hint && meshReady}
        onHintUsed={() => shell.setHint(false)}
        webglLost={webglLost}
        status={status}
        onRetry={() => {
          setRealityPixels(false);
          setRealityFailed(false);
          appearance.retryAppearance();
        }}
        measure={shell.measure}
        layer={appearance.layer}
        viewMode={shell.nav.mode}
        onLayer={appearance.requestLayer}
        onViewMode={shell.nav.setMode}
        onToggleMeasure={shell.measure.toggle}
        onReset={() => shell.goStation(shell.defaultStation)}
        walkEnabled={shell.walkEnabled}
        onToggleMove={() => shell.setWalkEnabled((v) => !v)}
        stations={shell.stations}
        currentStationId={shell.nav.currentStationId}
        onStation={shell.goStation}
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
          appearanceReady: realityPixels,
          dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
          drawCalls: infoRef.current,
        }}
      />
    </div>
  );
}
