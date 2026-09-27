"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const noop = () => {};

export type SceneCallbacks = {
  onProgress: (p: ModelProgress) => void;
  onError: (message: string) => void;
  onFirstFrame: () => void;
  onProfileCheck: (c: SparkProfileCheck) => void;
  onPin: (id: string) => void;
  onActivity: () => void;
};

export function Room213Scene({
  modelUrl,
  walkOnlyUrl,
  pagedRad = false,
  profile,
  view,
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
  /** Presentation complement shown only in Walk (faint wall splats that streak outside in exterior views). */
  walkOnlyUrl?: string;
  /** Experiment only: modelUrl is a paged RAD (LoD on, 16-bit paged ext splats). */
  pagedRad?: boolean;
  profile: SparkRenderProfile;
  view: Room213View;
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
    const s = new SparkRenderer({
      ...sparkRendererArgsFor(gl, profile, { enableLod: pagedRad }),
      ...(pagedRad ? { pagedExtSplats: true, lodSplatCount: 1_500_000 } : {}),
    });
    setSpark(s);
    return () => {
      setSpark(null);
      s.removeFromParent();
      s.dispose();
    };
  }, [gl, profile, pagedRad]);
  const sparkRef = useMemo(() => ({ current: spark }), [spark]);
  useSparkProfileCheck(sparkRef, profile, mesh, (c) => cb.current.onProfileCheck(c));

  const home = useMemo(() => heroPoseFor(size.width / Math.max(1, size.height)), [size.width, size.height]);
  const box = useMemo(() => debug?.cropOverride ?? cropBoxFor(view, walkCeilingHidden), [view, walkCeilingHidden, debug?.cropOverride]);
  const { pickPin, fileFrameRef } = usePinPicker(view);

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
          <PinLayer view={view} selected={selectedPin} accent={accent} />
        </group>
      </group>
      <Room213Model url={modelUrl} parent={room} onProgress={onProgress} onLoaded={onLoaded} onError={onError} paged={pagedRad} />
      {walkOnlyUrl ? (
        <Room213Model url={walkOnlyUrl} parent={room} onLoaded={noop} onError={onError} visible={view === "walk"} timed={false} />
      ) : null}
      <RoomCrop parent={room} box={box} />
      {view === "walk" ? (
        <WalkRig pose={walkPose} input={walkInput} keyTarget={keyTarget} pickPin={pickPin} onPin={onPin} onActivity={onActivity} accent={accent} />
      ) : view === "plan" ? (
        <PlanRig key={resetNonce} pickPin={pickPin} onPin={onPin} onActivity={onActivity} />
      ) : (
        <DollhouseRig key={resetNonce} home={home} pickPin={pickPin} onPin={onPin} onActivity={onActivity} poseOut={dollhousePose} />
      )}
    </>
  );
}
