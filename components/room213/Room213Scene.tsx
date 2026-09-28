"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SparkRenderer, type SplatMesh } from "@sparkjsdev/spark";
import { sparkRendererArgsFor, type SparkRenderProfile } from "@/lib/digital-twin/spark-render-profile";
import { useSparkProfileCheck, type SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";
import { CORRECTION_QUATERNION } from "@/lib/room213/scene-config";
import { cropBoxFor, type Room213View } from "@/lib/room213/edit-state";
import { heroPoseFor } from "@/lib/room213/hero";
import { markTiming } from "@/lib/room213/timing";
import { Room213Model, type ModelProgress } from "@/components/room213/Room213Model";
import { RoomCrop } from "@/components/room213/RoomCrop";
import { WalkRig, type WalkPose } from "@/components/room213/WalkRig";
import { DollhouseRig, PlanRig, type SavedOrbitPose } from "@/components/room213/OrbitRigs";
import { PinLayer, usePinPicker } from "@/components/room213/PinLayer";
import type { WalkInput } from "@/components/room213/walk-input";
import type { SceneDebug } from "@/components/room213/scene-debug";

export type SceneCallbacks = {
  /** The frame on screen is the finished render for the current viewpoint (after a switch or jump). */
  onSettled?: (token: number) => void;
  onProgress: (p: ModelProgress) => void;
  onError: (message: string) => void;
  onFirstFrame: () => void;
  onProfileCheck: (c: SparkProfileCheck) => void;
  onPin: (id: string) => void;
  /** Mouse hover over a live pin (null when none): drives the title label. */
  onPinHover?: (hover: { id: string; x: number; y: number } | null) => void;
  onActivity: () => void;
};

export function Room213Scene({
  modelUrl,
  profile,
  view,
  settleToken = 0,
  resetNonce,
  walkCeilingHidden,
  walkPose,
  dollhousePose,
  walkInput,
  keyTarget,
  selectedPin,
  accent,
  callbacks,
  debug,
}: {
  modelUrl: string;
  profile: SparkRenderProfile;
  view: Room213View;
  /** Incremented on each view switch; onSettled(token) fires once the new view is really on screen. */
  settleToken?: number;
  resetNonce: number;
  walkCeilingHidden: boolean;
  walkPose: WalkPose;
  dollhousePose: { current: SavedOrbitPose | null };
  walkInput: WalkInput;
  keyTarget: HTMLElement | null;
  selectedPin: string | null;
  accent: THREE.Color;
  callbacks: SceneCallbacks;
  debug?: SceneDebug;
}) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const [room, setRoom] = useState<THREE.Group | null>(null);
  const [mesh, setMesh] = useState<SplatMesh | null>(null);
  const cb = useRef(callbacks);
  cb.current = callbacks;

  // Verified profile → Spark args (accumExtSplats, blur 0, preBlur 0; LoD off). Created and disposed in ONE effect
  // (StrictMode-safe): dispose() kills Spark's sort worker and frees its ordering/accumulator targets, so a renderer
  // must never outlive its cleanup.
  const [spark, setSpark] = useState<SparkRenderer | null>(null);
  useEffect(() => {
    const s = new SparkRenderer(sparkRendererArgsFor(gl, profile, { enableLod: false }));
    // Probe-only A/B switches for the on-device motion-artefact investigation (never set for recipients).
    if (debug?.diag?.includes("px")) s.maxPixelRadius = 96;
    if (debug?.diag?.includes("alpha")) s.minAlpha = 0.02;
    setSpark(s);
    return () => {
      setSpark(null);
      s.removeFromParent();
      s.dispose();
    };
  }, [gl, profile, debug?.diag]);
  const sparkRef = useMemo(() => ({ current: spark }), [spark]);
  useSparkProfileCheck(sparkRef, profile, mesh, (c) => cb.current.onProfileCheck(c));

  // Camera director: the scene OWNS both cameras and switches the default explicitly per view (no library
  // `makeDefault` races). Perspective = Dollhouse + Walk (world-up enforced by the rigs); orthographic = Plan.
  const set = useThree((s) => s.set);
  const persp = useMemo(() => new THREE.PerspectiveCamera(45, 1, 0.05, 500), []);
  const ortho = useMemo(() => {
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    c.up.set(0, 0, -1);
    return c;
  }, []);
  const active = view === "plan" ? ortho : persp;
  useLayoutEffect(() => {
    persp.aspect = size.width / Math.max(1, size.height);
    persp.updateProjectionMatrix();
    ortho.left = -size.width / 2;
    ortho.right = size.width / 2;
    ortho.top = size.height / 2;
    ortho.bottom = -size.height / 2;
    ortho.updateProjectionMatrix();
  }, [persp, ortho, size.width, size.height]);
  useLayoutEffect(() => {
    set({ camera: active as THREE.PerspectiveCamera });
  }, [set, active]);

  // Probe-only readout (window.__r213 exists only with ?probe=1 / ?internal=1): the camera actually rendering.
  const defaultCam = useThree((s) => s.camera);
  useEffect(() => {
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (!w.__r213) return;
    w.__r213.spark = spark;
    w.__r213.cam = () => {
      const c = defaultCam;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
      return {
        view,
        type: (c as THREE.OrthographicCamera).isOrthographicCamera ? "ortho" : "persp",
        isIntended: c === active,
        rollDeg: +THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(right.y, -1, 1))).toFixed(2),
        pitchDeg: +THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1))).toFixed(1),
        up: c.up.toArray(),
        pos: c.position.toArray().map((v) => +v.toFixed(2)),
        fov: (c as THREE.PerspectiveCamera).fov,
        dpr: gl.getPixelRatio(),
        buffer: [gl.getContext().drawingBufferWidth, gl.getContext().drawingBufferHeight],
        css: [size.width, size.height],
        spark: spark && (() => {
          const k = spark as unknown as { sorting?: boolean; sortDirty?: boolean; sortedCenter?: THREE.Vector3; sortedDir?: THREE.Vector3; display?: unknown; current?: { viewOrigin?: THREE.Vector3 } };
          return { sorting: k.sorting, sortDirty: k.sortDirty, sortedCenter: k.sortedCenter?.toArray().map((v) => +v.toFixed(2)), viewOrigin: k.current?.viewOrigin?.toArray().map((v) => +v.toFixed(2)), displayIsCurrent: k.display === k.current };
        })(),
      };
    };
  });

  const aspect = size.width / Math.max(1, size.height);
  const aspectClass = aspect >= 1 ? "landscape" : "portrait";
  const home = useMemo(() => heroPoseFor(aspect), [aspect]);
  const box = useMemo(() => debug?.cropOverride ?? cropBoxFor(view, walkCeilingHidden), [view, walkCeilingHidden, debug?.cropOverride]);
  const { pickPin, fileFrameRef } = usePinPicker(view, active);
  const canvasEl = useThree((s) => s.gl.domElement);
  useEffect(() => {
    let last = 0;
    let shown = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || performance.now() - last < 60) return;
      last = performance.now();
      const id = pickPin(e.clientX, e.clientY);
      if (id || shown) cb.current.onPinHover?.(id ? { id, x: e.clientX, y: e.clientY } : null);
      shown = Boolean(id);
      if (id) canvasEl.style.cursor = "pointer";
    };
    const leave = () => cb.current.onPinHover?.(null);
    canvasEl.addEventListener("pointermove", move);
    canvasEl.addEventListener("pointerleave", leave);
    return () => {
      canvasEl.removeEventListener("pointermove", move);
      canvasEl.removeEventListener("pointerleave", leave);
    };
  }, [canvasEl, pickPin]);

  // First usable frame: the mesh is in the scene AND Spark has sorted/drawn splats for two consecutive frames.
  const frames = useRef(0);
  const reported = useRef(false);
  useFrame(() => {
    if (!mesh || reported.current) return;
    const active = (spark as unknown as { activeSplats?: number } | null)?.activeSplats ?? 0;
    frames.current = active > 0 ? frames.current + 1 : 0;
    if (frames.current >= 2) {
      reported.current = true;
      markTiming("firstFrame");
      cb.current.onFirstFrame();
    }
  });

  // Spark draws the newest splat buffer immediately but its depth ORDER only after an asynchronous sort (GPU depth
  // readback + worker) finishes; until then a new viewpoint is blended in the previous viewpoint's order, which
  // reads as ghosting/softness. "Settled" = no sort pending AND the displayed buffer and its order were both taken
  // from where the camera is now. No timers: this is the actual renderer state. (Measured: control == viewer once
  // settled, docs/ops/room213-poc/FIDELITY.md.)
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const settle = useRef({ token: -1, frames: 0 });
  const sortStats = useRef({ sorting: false, since: 0, last: 0, max: 0, count: 0 });
  useFrame(() => {
    if (!spark || !mesh) return;
    const s = spark as unknown as { display?: unknown; current?: { viewOrigin?: THREE.Vector3 }; sorting?: boolean; sortDirty?: boolean; sortedCenter?: THREE.Vector3 };
    const st = sortStats.current;
    if (s.sorting && !st.sorting) st.since = performance.now();
    if (!s.sorting && st.sorting) {
      st.last = Math.round(performance.now() - st.since);
      st.max = Math.max(st.max, st.last);
      st.count += 1;
    }
    st.sorting = !!s.sorting;
    if (settle.current.token === settleToken) return;
    active.getWorldPosition(camPos);
    const settled =
      !s.sorting && !s.sortDirty && s.display === s.current &&
      !!s.current?.viewOrigin && s.current.viewOrigin.distanceTo(camPos) < 0.02 &&
      !!s.sortedCenter && s.sortedCenter.distanceTo(camPos) < 0.02;
    settle.current.frames = settled ? settle.current.frames + 1 : 0;
    if (settle.current.frames >= 2) {
      settle.current = { token: settleToken, frames: 0 };
      cb.current.onSettled?.(settleToken);
    }
  });
  useEffect(() => {
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (w.__r213) w.__r213.sortStats = () => ({ ...sortStats.current });
  });

  const onLoaded = useCallback((m: SplatMesh) => setMesh(m), []);
  const onProgress = useCallback((p: ModelProgress) => cb.current.onProgress(p), []);
  const onError = useCallback((msg: string) => cb.current.onError(msg), []);
  const onPin = useCallback((id: string) => cb.current.onPin(id), []);
  const onActivity = useCallback(() => cb.current.onActivity(), []);

  return (
    <>
      {spark ? <primitive object={spark} /> : null}
      <group ref={setRoom} quaternion={CORRECTION_QUATERNION}>
        <group ref={fileFrameRef} rotation={[Math.PI, 0, 0]}>
          <PinLayer view={view} selected={selectedPin} accent={accent} camera={active} />
        </group>
      </group>
      <Room213Model url={modelUrl} parent={room} onProgress={onProgress} onLoaded={onLoaded} onError={onError} />
      <RoomCrop parent={room} box={box} />
      {view === "walk" ? (
        <WalkRig near={debug?.diag?.includes("near05") ? 0.05 : 0.2} camera={persp} pose={walkPose} input={walkInput} keyTarget={keyTarget} pickPin={pickPin} onPin={onPin} onActivity={onActivity} accent={accent} />
      ) : view === "plan" ? (
        <PlanRig key={resetNonce} camera={ortho} pickPin={pickPin} onPin={onPin} onActivity={onActivity} />
      ) : (
        <DollhouseRig key={resetNonce} camera={persp} home={home} aspectClass={aspectClass} pickPin={pickPin} onPin={onPin} onActivity={onActivity} poseOut={dollhousePose} />
      )}
    </>
  );
}
