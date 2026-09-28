"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { resolveSparkRenderProfile } from "@/lib/digital-twin/spark-render-profile";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import type { SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";
import type { Room213View } from "@/lib/room213/edit-state";
import type { SavedOrbitPose } from "@/components/room213/OrbitRigs";
import { markTiming, getTiming } from "@/lib/room213/timing";
import { Room213Scene } from "@/components/room213/Room213Scene";
import type { ModelProgress } from "@/components/room213/Room213Model";
import { createWalkInput, clearWalkInput } from "@/components/room213/walk-input";
import { rehomeWalk, walkEntryPose } from "@/components/room213/walk-entry";
import type { WalkPose } from "@/components/room213/WalkRig";
import { cssColor } from "@/components/room213/plaque-texture";
import { CanvasBoundary, webgl2Available } from "@/components/room213/CanvasBoundary";
import { goldenFidelity } from "@/lib/room213/fidelity";
import { ControlStrip } from "@/components/room213/ControlStrip";
import { ContentSheet, type SheetState } from "@/components/room213/ContentSheet";
import { LoadingPoster } from "@/components/room213/LoadingPoster";
import { WalkJoystick } from "@/components/room213/WalkJoystick";
import { LandscapeTip, NavHints } from "@/components/room213/NavHints";
import { ROOM213_PINS } from "@/lib/room213/pins";
import { pinViewPose } from "@/lib/room213/pin-focus";
import { useViewTransition } from "@/components/room213/useViewTransition";
import { Identity, InternalPanel, PinHoverLabel } from "@/components/room213/ExperienceChrome";
import { useClearOnLifecycle, useLandscapeFullscreen, useOutsidePressDismiss, useQuietControls, useMedia, useSessionBool, useVisualViewportBox } from "@/components/room213/ui-hooks";
import type { SceneDebug } from "@/components/room213/scene-debug";

type Phase = "loading" | "preparing" | "ready" | "error";

export function Room213Experience({
  modelUrl,
  fallbackUrl,
  modelBytes,
  manifest,
  sourceSha,
  internal,
  probe,
  posterMode,
  probeDpr,
}: {
  modelUrl: string;
  /** The same file from this deployment's own route: used automatically if the media host fails (e.g. CORS). */
  fallbackUrl?: string;
  modelBytes: number;
  manifest: SplatManifest;
  /** The golden model's sha256 (the only asset; pins are bound to it). */
  sourceSha: string;
  internal: boolean;
  /** Test hooks on window.__r213 (verification probes); implied by `internal`. */
  probe: boolean;
  posterMode: boolean;
  /** Probe-only fixed pixel ratio; otherwise min(devicePixelRatio, 2), fixed for the session (no adaptive drop). */
  probeDpr?: number;
}) {
  const profile = useMemo(() => resolveSparkRenderProfile(manifest), [manifest]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState<ModelProgress>({ loaded: 0, total: modelBytes, phase: "transfer" });
  const [error, setError] = useState<{ title?: string; detail: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [ceilingHidden, setCeilingHidden] = useSessionBool("room213.walkCeilingHidden", false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [check, setCheck] = useState<SparkProfileCheck | null>(null);
  const [debug, setDebug] = useState<SceneDebug>({});
  const [hoverPin, setHoverPin] = useState<{ id: string; x: number; y: number } | null>(null);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const coarse = useMedia("(pointer: coarse)");
  const landscape = useMedia("(orientation: landscape)");
  const viewportBox = useVisualViewportBox();
  const walkInput = useMemo(() => createWalkInput(), []);
  const walkPose = useMemo<WalkPose>(() => walkEntryPose(), []);
  const dollhousePose = useRef<SavedOrbitPose | null>(null);
  const [accent, setAccent] = useState(() => new THREE.Color());
  const [canvasBg, setCanvasBg] = useState(() => new THREE.Color());
  const { quiet, poke } = useQuietControls(4000, menuOpen || sheet !== null);

  useEffect(() => {
    setAccent(cssColor("--mkt-brand-green"));
    setCanvasBg(cssColor("--graphite-canvas"));
  }, []);

  useClearOnLifecycle(() => clearWalkInput(walkInput));
  useLandscapeFullscreen(root, coarse && landscape);
  // Tap/click outside the sheet or menu closes it (the press is consumed, never also moves the camera).
  useOutsidePressDismiss(sheet !== null || menuOpen, () => (setSheet(null), setMenuOpen(false)));

  const { view, goView, fade, slow: slowSwitch, settleToken, onSettled, transitions } = useViewTransition(reducedMotion, () => {
    clearWalkInput(walkInput);
    setMenuOpen(false);
    setSheet(null);
    setHoverPin(null);
  });

  const [resetNonce, setResetNonce] = useState(0);
  // Reset (never reloads the model) is authoritative and stays in the mode: under the cover Walk returns to the
  // curated entry (the epoch bump cancels any step in flight), Dollhouse to its hero orbit, Plan to its fitted plan.
  const resetView = useCallback(() => {
    setSheet(null);
    goView(view, () => {
      if (view === "walk") rehomeWalk(walkPose, walkEntryPose());
      if (view === "dollhouse") dollhousePose.current = null;
      setResetNonce((n) => n + 1);
    });
  }, [goView, view, walkPose]);

  // "View in room": walk to a spot facing the pin (under the transition cover) and highlight it briefly.
  const [focusPin, setFocusPin] = useState<string | null>(null);
  const viewInRoom = useCallback(
    (id: string) => {
      const pin = ROOM213_PINS.find((p) => p.pin_id === id);
      if (!pin) return;
      setSheet(null);
      goView("walk", () => rehomeWalk(walkPose, pinViewPose(pin)));
      setFocusPin(id);
      window.setTimeout(() => setFocusPin((f) => (f === id ? null : f)), 3500);
    },
    [goView, walkPose],
  );

  const openPin = useCallback((id: string) => {
    clearWalkInput(walkInput);
    setMenuOpen(false);
    setSheet({ kind: "pin", id });
  }, [walkInput]);

  const [contextLost, setContextLost] = useState(false);
  const retry = useCallback(() => {
    if (contextLost) setCanvasKey((k) => k + 1);
    setContextLost(false);
    setError(null);
    setPhase("loading");
    setProgress({ loaded: 0, total: modelBytes, phase: "transfer" });
    setAttempt((a) => a + 1);
  }, [modelBytes, contextLost]);

  // Escape: close the topmost UI, else stop motion.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sheet) setSheet(null);
      else if (menuOpen) setMenuOpen(false);
      else clearWalkInput(walkInput);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, menuOpen, walkInput]);

  // Verification hooks only (?probe=1 / ?internal=1) — never present for recipients.
  useEffect(() => {
    if (!probe) return;
    const w = window as unknown as { __r213?: Record<string, unknown> };
    w.__r213 = Object.assign(w.__r213 ?? {}, {
      check, phase, view, timing: getTiming(), transitions, setView: goView, resetView, setCropOverride: (b: THREE.Box3 | null) => setDebug({ cropOverride: b }),
      THREE, walkPose, dollhousePose, openPin, setCeilingHidden,
    });
  }, [probe, check, phase, view, goView, resetView, transitions, walkPose, openPin, setCeilingHidden]);

  // WebGL2 is required; without it (or if the renderer fails to start) show the bounded start-failure state.
  const startFailed = useCallback((detail: string) => {
    console.error("[room213] 3D start failure:", detail);
    setError({ title: "3D view couldn\u2019t start.", detail: "This browser or device couldn\u2019t open the 3D view. Try again, or open the link in Safari or Chrome." });
    setPhase("error");
  }, []);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    const ok = webgl2Available();
    setWebgl(ok);
    if (!ok) startFailed("webgl2 unavailable");
  }, [attempt, startFailed]);

  const [useFallback, setUseFallback] = useState(false);
  const src = useFallback && fallbackUrl ? fallbackUrl : modelUrl;
  const url = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}attempt=${attempt}`;
  const ready = phase === "ready";
  const fidelity = useMemo(() => goldenFidelity(profile, check), [profile, check]);

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        setRoot(el);
      }}
      tabIndex={-1}
      onPointerDown={() => {
        poke();
        if (document.activeElement === document.body) rootRef.current?.focus({ preventScroll: true });
      }}
      className="fixed inset-x-0 top-0 h-[100dvh] overflow-hidden bg-[var(--graphite-canvas)] outline-none"
      style={{ touchAction: "none", ...viewportBox }}
    >
      {webgl ? (
      <CanvasBoundary key={`b${canvasKey}-${attempt}`} onError={startFailed}>
      <Canvas
        key={canvasKey}
        className="absolute inset-0"
        dpr={probeDpr ?? [1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.05, far: 500, position: [8, 6, 8] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setContextLost(true);
            setError({ detail: "The 3D view was interrupted by the device." });
            setPhase("error");
          });
        }}
      >
        <color attach="background" args={[canvasBg]} />
        <Room213Scene
          key={attempt}
          resetNonce={resetNonce}
          settleToken={settleToken}
          modelUrl={url}
          profile={profile}
          view={view}
          walkCeilingHidden={ceilingHidden}
          walkPose={walkPose}
          dollhousePose={dollhousePose}
          walkInput={walkInput}
          keyTarget={root}
          selectedPin={sheet?.kind === "pin" ? sheet.id : focusPin}
          accent={accent}
          debug={debug}
          callbacks={{
            onSettled,
            onProgress: (p) => {
              setProgress(p);
              if (p.phase === "preparing") setPhase("preparing");
            },
            onError: (m) => {
              if (fallbackUrl && !useFallback) {
                setUseFallback(true); // one silent retry from this deployment's own route
                setAttempt((a) => a + 1);
                return;
              }
              console.error("[room213] model load failed:", m);
              setError({ detail: "The connection was interrupted before the 3D capture finished loading." });
              setPhase("error");
            },
            onFirstFrame: () => {
              markTiming("interactive");
              setPhase("ready");
            },
            onProfileCheck: setCheck,
            onPin: openPin,
            onPinHover: setHoverPin,
            onActivity: poke,
          }}
        />
      </Canvas>
      </CanvasBoundary>
      ) : null}

      <div className={`pointer-events-none absolute inset-0 bg-[var(--graphite-canvas)] transition-opacity ${reducedMotion ? "duration-0" : "duration-150"} ${fade ? "opacity-100" : "opacity-0"}`} aria-hidden>
        {fade && slowSwitch ? <p className="absolute inset-x-0 top-1/2 text-center text-[13px] text-[var(--mkt-canvas-deep)]">Preparing view…</p> : null}
      </div>

      <LoadingPoster phase={phase} progress={progress} error={error?.detail ?? null} errorTitle={error?.title} onRetry={error ? retry : undefined} posterMode={posterMode} />

      {!posterMode && ready ? (
        <>
          <ControlStrip
            view={view}
            quiet={quiet}
            menuOpen={menuOpen}
            onMenu={(open) => (open && setSheet(null), setMenuOpen(open))}
            onView={goView}
            ceilingHidden={ceilingHidden}
            onCeiling={(hidden) => setCeilingHidden(hidden)}
            onRoomInfo={() => (setMenuOpen(false), setSheet({ kind: "room" }))}
            onReset={resetView}
            root={root}
            onActivity={poke}
            sheetOpen={sheet !== null}
          />
          {view === "walk" && coarse && landscape && !sheet ? <WalkJoystick input={walkInput} onActivity={poke} /> : null}
          <NavHints view={view} coarse={coarse} landscape={landscape} />
          <LandscapeTip coarse={coarse} landscape={landscape} hidden={sheet !== null || menuOpen} onFirstLandscape={() => view === "dollhouse" && goView("walk")} />
          {fidelity.state === "degraded" ? (
            <p role="status" className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-20 mx-auto w-fit rounded-md bg-[var(--mkt-surface)] px-3 py-1 text-[11px] text-[var(--mkt-ink)]">
              This device is showing a reduced-quality view of the model.
            </p>
          ) : null}
        </>
      ) : null}
      {!posterMode ? <Identity /> : null}
      {hoverPin && !sheet ? <PinHoverLabel {...hoverPin} /> : null}
      <ContentSheet state={sheet} onClose={() => setSheet(null)} onOpenPin={openPin} onViewInRoom={viewInRoom} />
      {internal && phase !== "loading" ? <InternalPanel check={check} fidelity={fidelity} sourceSha={sourceSha} phase={phase} transitions={transitions} /> : null}
    </div>
  );
}
