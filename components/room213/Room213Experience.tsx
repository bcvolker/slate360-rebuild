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
import { walkEntryPose } from "@/components/room213/walk-entry";
import type { WalkPose } from "@/components/room213/WalkRig";
import { cssColor } from "@/components/room213/plaque-texture";
import { AdaptiveDpr } from "@/components/room213/AdaptiveDpr";
import { ControlStrip } from "@/components/room213/ControlStrip";
import { ContentSheet, type SheetState } from "@/components/room213/ContentSheet";
import { LoadingPoster } from "@/components/room213/LoadingPoster";
import { WalkJoystick } from "@/components/room213/WalkJoystick";
import { NavHints } from "@/components/room213/NavHints";
import { useQuietControls, useMedia, useSessionBool } from "@/components/room213/ui-hooks";
import type { SceneDebug } from "@/components/room213/scene-debug";

type Phase = "loading" | "preparing" | "ready" | "error";

export function Room213Experience({
  modelUrl,
  modelBytes,
  manifest,
  sourceSha,
  internal,
  probe,
  posterMode,
}: {
  modelUrl: string;
  modelBytes: number;
  manifest: SplatManifest;
  sourceSha: string;
  internal: boolean;
  /** Test hooks on window.__r213 (verification probes); implied by `internal`. */
  probe: boolean;
  posterMode: boolean;
}) {
  const profile = useMemo(() => resolveSparkRenderProfile(manifest), [manifest]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState<ModelProgress>({ loaded: 0, total: modelBytes, phase: "transfer" });
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [view, setView] = useState<Room213View>("dollhouse");
  const [ceilingHidden, setCeilingHidden] = useSessionBool("room213.walkCeilingHidden", false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [fade, setFade] = useState(false);
  const [check, setCheck] = useState<SparkProfileCheck | null>(null);
  const [debug, setDebug] = useState<SceneDebug>({});
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const coarse = useMedia("(pointer: coarse)");
  const landscape = useMedia("(orientation: landscape)");
  const walkInput = useMemo(() => createWalkInput(), []);
  const walkPose = useMemo<WalkPose>(() => walkEntryPose(), []);
  const walkEntered = useRef(false);
  const dollhousePose = useRef<SavedOrbitPose | null>(null);
  const [accent, setAccent] = useState(() => new THREE.Color());
  const [canvasBg, setCanvasBg] = useState(() => new THREE.Color());
  const { quiet, poke } = useQuietControls(4000, menuOpen || sheet !== null);

  useEffect(() => {
    setAccent(cssColor("--mkt-brand-green"));
    setCanvasBg(cssColor("--graphite-canvas"));
  }, []);

  // Lifecycle: backgrounding / orientation / blur clear held movement (never reloads the model).
  useEffect(() => {
    const clear = () => clearWalkInput(walkInput);
    const vis = () => document.visibilityState === "hidden" && clear();
    window.addEventListener("orientationchange", clear);
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("orientationchange", clear);
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [walkInput]);

  const goView = useCallback(
    (next: Room213View) => {
      clearWalkInput(walkInput);
      setMenuOpen(false);
      if (next === view) return;
      if (next === "walk" && !walkEntered.current) walkEntered.current = true;
      if (reducedMotion || next === "plan" || view === "plan") {
        setView(next);
        return;
      }
      // Dollhouse ⇄ Walk: a short fade through the canvas colour instead of a flight through walls.
      setFade(true);
      window.setTimeout(() => {
        setView(next);
        window.setTimeout(() => setFade(false), 60);
      }, 180);
    },
    [view, walkInput, reducedMotion],
  );

  // Reset re-homes the current view's camera only (rigs remount on resetNonce); the model is never reloaded.
  const [resetNonce, setResetNonce] = useState(0);
  const resetView = useCallback(() => {
    setMenuOpen(false);
    clearWalkInput(walkInput);
    if (view === "walk") Object.assign(walkPose, walkEntryPose());
    else dollhousePose.current = null;
    setResetNonce((n) => n + 1);
  }, [view, walkInput, walkPose]);

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
      check, phase, view, timing: getTiming(), setView: goView, setCropOverride: (b: THREE.Box3 | null) => setDebug({ cropOverride: b }),
      THREE, walkPose, dollhousePose, openPin, setCeilingHidden,
    });
  }, [probe, check, phase, view, goView, walkPose, openPin, setCeilingHidden]);

  const url = attempt === 0 ? modelUrl : `${modelUrl}${modelUrl.includes("?") ? "&" : "?"}attempt=${attempt}`;
  const ready = phase === "ready";
  const reduced = check !== null && !check.ok;

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
      className="fixed inset-0 overflow-hidden bg-[var(--graphite-canvas)] outline-none"
      style={{ touchAction: "none" }}
    >
      <Canvas
        key={canvasKey}
        className="absolute inset-0"
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.05, far: 500, position: [8, 6, 8] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setContextLost(true);
            setError("The 3D view was interrupted by the device.");
            setPhase("error");
          });
        }}
      >
        <color attach="background" args={[canvasBg]} />
        <Room213Scene
          key={attempt}
          resetNonce={resetNonce}
          modelUrl={url}
          profile={profile}
          view={view}
          walkCeilingHidden={ceilingHidden}
          walkPose={walkPose}
          dollhousePose={dollhousePose}
          walkInput={walkInput}
          keyTarget={root}
          selectedPin={sheet?.kind === "pin" ? sheet.id : null}
          accent={accent}
          debug={debug}
          callbacks={{
            onProgress: (p) => {
              setProgress(p);
              if (p.phase === "preparing") setPhase("preparing");
            },
            onError: (m) => {
              setError(m);
              setPhase("error");
            },
            onFirstFrame: () => {
              markTiming("interactive");
              setPhase("ready");
            },
            onProfileCheck: setCheck,
            onPin: openPin,
            onActivity: poke,
          }}
        />
        <AdaptiveDpr enabled={ready} />
      </Canvas>

      <div className={`pointer-events-none absolute inset-0 bg-[var(--graphite-canvas)] transition-opacity duration-150 ${fade ? "opacity-100" : "opacity-0"}`} aria-hidden />

      <LoadingPoster phase={phase} progress={progress} error={error} onRetry={error ? retry : undefined} posterMode={posterMode} />

      {!posterMode && ready ? (
        <>
          <ControlStrip
            view={view}
            quiet={quiet}
            menuOpen={menuOpen}
            onMenu={setMenuOpen}
            onView={goView}
            ceilingHidden={ceilingHidden}
            onCeiling={(hidden) => setCeilingHidden(hidden)}
            onRoomInfo={() => (setMenuOpen(false), setSheet({ kind: "room" }))}
            onReset={resetView}
            root={root}
            onActivity={poke}
          />
          {view === "walk" && coarse && landscape && !sheet ? <WalkJoystick input={walkInput} onActivity={poke} /> : null}
          <NavHints view={view} coarse={coarse} landscape={landscape} />
          {reduced ? (
            <p role="status" className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-20 mx-auto w-fit rounded-md bg-[var(--mkt-surface)] px-3 py-1 text-[11px] text-[var(--mkt-ink)]">
              This device is showing a reduced-quality view of the model.
            </p>
          ) : null}
        </>
      ) : null}
      {!posterMode ? <Identity /> : null}
      <ContentSheet state={sheet} onClose={() => setSheet(null)} onOpenPin={openPin} />
      {internal ? <InternalPanel check={check} sourceSha={sourceSha} phase={phase} /> : null}
    </div>
  );
}

function Identity() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-20 pl-[max(1rem,env(safe-area-inset-left))] pt-[max(0.9rem,env(safe-area-inset-top))]">
      <div className="rounded-lg bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-2.5 py-1.5 backdrop-blur-sm">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--mkt-brand-green)]">SLATE360</p>
        <p className="text-[13px] font-semibold leading-tight text-[var(--mkt-surface)]">Payne Hall — Room 213</p>
      </div>
    </div>
  );
}

function InternalPanel({ check, sourceSha, phase }: { check: SparkProfileCheck | null; sourceSha: string; phase: Phase }) {
  const t = getTiming();
  return (
    <pre className="pointer-events-none absolute right-2 top-2 z-40 max-w-[70vw] whitespace-pre-wrap rounded-md bg-black/70 p-2 font-mono text-[10px] leading-tight text-white">
      {[
        `phase ${phase} · model ${sourceSha.slice(0, 12)}`,
        check ? `profile ${check.expected} ${check.ok ? "OK" : `MISMATCH ${check.mismatches.join(",")}`}` : "profile …",
        check ? `accumExt ${check.effective.accumExtSplats} blur ${check.effective.uniformBlurAmount} preBlur ${check.effective.uniformPreBlurAmount}` : "",
        check ? `splats ${check.effective.activeSplats}/${check.effective.modelSplats} acc ${(check.effective.accumulatorBytes / 1048576).toFixed(1)}MB buf ${check.effective.drawingBuffer.join("x")}@${check.effective.pixelRatio}` : "",
        Object.entries(t).map(([k, v]) => `${k} ${v}`).join(" · "),
      ].join("\n")}
    </pre>
  );
}
