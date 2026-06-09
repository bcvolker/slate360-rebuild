"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, extend, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AlertTriangle, Loader2 } from "lucide-react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { frameSplatMesh, type SplatCameraFrame } from "@/lib/digital-twin/splat-camera-frame";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export const SPLAT_VIEWER_SURFACE =
  "relative min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]";

const MOBILE_MAX_SPLATS = 80_000;
const DESKTOP_MAX_SPLATS = 250_000;
const WALK_LOOK_SENSITIVITY = 0.003;
const WALK_MOVE_SPEED = 2.5;

type LoadState = "loading" | "ready" | "error";
type CameraMode = "orbit" | "walk";

export type TwinPickPoint = { x: number; y: number; z: number };

export type SplatViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
};

function useMobileSplatBudget() {
  const [maxSplats, setMaxSplats] = useState(DESKTOP_MAX_SPLATS);

  useEffect(() => {
    const coarse = window.matchMedia("(max-width: 768px)").matches;
    const fine = window.matchMedia("(pointer: coarse)").matches;
    setMaxSplats(coarse || fine ? MOBILE_MAX_SPLATS : DESKTOP_MAX_SPLATS);
  }, []);

  return maxSplats;
}

function PickProxy({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
}) {
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!enabled || !onPick) return;
      event.stopPropagation();
      const p = event.point;
      onPick({ x: p.x, y: p.y, z: p.z });
    },
    [enabled, onPick],
  );

  return (
    <mesh visible={false} onClick={handleClick}>
      <sphereGeometry args={[4, 32, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function WalkControls({ active }: { active: boolean }) {
  const { camera, gl } = useThree();
  const moveRef = useRef({ forward: 0, right: 0 });
  const lookRef = useRef({ dragging: false, lastX: 0, lastY: 0, pointerId: -1 });
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const forwardVec = useMemo(() => new THREE.Vector3(), []);
  const rightVec = useMemo(() => new THREE.Vector3(), []);
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!active) return;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    yawRef.current = Math.atan2(direction.x, direction.z);
    pitchRef.current = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
  }, [active, camera]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveRef.current.forward = 1;
          break;
        case "KeyS":
        case "ArrowDown":
          moveRef.current.forward = -1;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveRef.current.right = -1;
          break;
        case "KeyD":
        case "ArrowRight":
          moveRef.current.right = 1;
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
        case "KeyS":
        case "ArrowDown":
          moveRef.current.forward = 0;
          break;
        case "KeyA":
        case "ArrowLeft":
        case "KeyD":
        case "ArrowRight":
          moveRef.current.right = 0;
          break;
      }
    };

    const canvas = gl.domElement;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      lookRef.current.dragging = true;
      lookRef.current.pointerId = event.pointerId;
      lookRef.current.lastX = event.clientX;
      lookRef.current.lastY = event.clientY;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!lookRef.current.dragging || event.pointerId !== lookRef.current.pointerId) return;
      const dx = event.clientX - lookRef.current.lastX;
      const dy = event.clientY - lookRef.current.lastY;
      lookRef.current.lastX = event.clientX;
      lookRef.current.lastY = event.clientY;
      yawRef.current -= dx * WALK_LOOK_SENSITIVITY;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - dy * WALK_LOOK_SENSITIVITY,
        -Math.PI / 2 + 0.12,
        Math.PI / 2 - 0.12,
      );
    };

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== lookRef.current.pointerId) return;
      lookRef.current.dragging = false;
      lookRef.current.pointerId = -1;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      moveRef.current.forward = 0;
      moveRef.current.right = 0;
      lookRef.current.dragging = false;
    };
  }, [active, gl]);

  useFrame((_, delta) => {
    if (!active) return;

    forwardVec.set(
      Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      Math.cos(yawRef.current) * Math.cos(pitchRef.current),
    );
    rightVec.crossVectors(forwardVec, upVec).normalize();

    const speed = WALK_MOVE_SPEED * delta;
    camera.position.addScaledVector(forwardVec, moveRef.current.forward * speed);
    camera.position.addScaledVector(rightVec, moveRef.current.right * speed);

    lookTarget.copy(camera.position).add(forwardVec);
    camera.lookAt(lookTarget);
  });

  return null;
}

function SplatCameraController({
  mesh,
  resetToken,
  onDefaultFrame,
}: {
  mesh: SplatMesh | null;
  resetToken: number;
  onDefaultFrame: (frame: SplatCameraFrame) => void;
}) {
  const { camera, controls } = useThree();
  const framedRef = useRef(false);

  useEffect(() => {
    framedRef.current = false;
  }, [mesh]);

  const applyDefaultFrame = useCallback(() => {
    if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    const orbit = controls as OrbitControlsImpl | null;
    const frame = frameSplatMesh(mesh, camera, orbit);
    onDefaultFrame(frame);
  }, [mesh, camera, controls, onDefaultFrame]);

  useEffect(() => {
    if (!mesh?.isInitialized || framedRef.current) return;
    const id = window.requestAnimationFrame(() => {
      framedRef.current = true;
      applyDefaultFrame();
    });
    return () => window.cancelAnimationFrame(id);
  }, [mesh, applyDefaultFrame]);

  useEffect(() => {
    if (resetToken <= 0) return;
    applyDefaultFrame();
  }, [resetToken, applyDefaultFrame]);

  return null;
}

function ControlsBridge({
  apiRef,
  cameraMode,
  onRecenter,
}: {
  apiRef: React.MutableRefObject<SplatViewerHandle | null>;
  cameraMode: CameraMode;
  onRecenter: () => void;
}) {
  const { camera, controls } = useThree();
  const orbit = controls as OrbitControlsImpl | null;

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        if (cameraMode !== "orbit" || !orbit) return;
        orbit.dollyIn(1.2);
        orbit.update();
      },
      zoomOut: () => {
        if (cameraMode !== "orbit" || !orbit) return;
        orbit.dollyOut(1.2);
        orbit.update();
      },
      recenter: onRecenter,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, cameraMode, orbit, camera, onRecenter]);

  return null;
}

function SparkSplatScene({
  url,
  maxSplats,
  onReady,
  onMeshReady,
  pickEnabled,
  onPick,
  cameraMode,
  modelVisible,
  overlay,
  resetToken,
  onDefaultFrame,
  controlsApiRef,
  onRecenter,
}: {
  url: string;
  maxSplats: number;
  onReady: () => void;
  onMeshReady: (mesh: SplatMesh) => void;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode: CameraMode;
  modelVisible: boolean;
  overlay?: ReactNode;
  resetToken: number;
  onDefaultFrame: (frame: SplatCameraFrame) => void;
  controlsApiRef: React.MutableRefObject<SplatViewerHandle | null>;
  onRecenter: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const [loadedMesh, setLoadedMesh] = useState<SplatMesh | null>(null);

  useEffect(() => {
    setLoadedMesh(null);
  }, [url]);

  const sparkArgs = useMemo(() => ({ renderer: gl, enableLod: true }), [gl]);
  const splatArgs = useMemo(
    () => ({
      url,
      lod: true,
      maxSplats,
      onLoad: (mesh: SplatMesh) => {
        onMeshReady(mesh);
        setLoadedMesh(mesh);
        onReady();
      },
    }),
    [url, maxSplats, onMeshReady, onReady],
  );

  return (
    <>
      <group visible={modelVisible}>
        <sparkRenderer args={[sparkArgs]}>
          <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
      {loadedMesh ? (
        <SplatCameraController
          mesh={loadedMesh}
          resetToken={resetToken}
          onDefaultFrame={onDefaultFrame}
        />
      ) : null}
      {overlay}
      <PickProxy enabled={pickEnabled} onPick={onPick} />
      <ControlsBridge apiRef={controlsApiRef} cameraMode={cameraMode} onRecenter={onRecenter} />
      {cameraMode === "orbit" ? (
        <OrbitControls makeDefault enablePan enableZoom enableRotate />
      ) : (
        <WalkControls active />
      )}
    </>
  );
}

export const SplatViewerCore = forwardRef<
  SplatViewerHandle,
  {
    src: string;
    className?: string;
    pickEnabled?: boolean;
    onPick?: (point: TwinPickPoint) => void;
    cameraMode?: CameraMode;
    modelVisible?: boolean;
    overlay?: ReactNode;
    showResetView?: boolean;
  }
>(function SplatViewerCore(
  {
    src,
    className,
    pickEnabled = false,
    onPick,
    cameraMode = "orbit",
    modelVisible = true,
    overlay,
  },
  ref,
) {
  const maxSplats = useMobileSplatBudget();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const controlsApiRef = useRef<SplatViewerHandle | null>(null);

  const handleReady = useCallback(() => setLoadState("ready"), []);
  const handleMeshReady = useCallback((_mesh: SplatMesh) => {}, []);
  const handleDefaultFrame = useCallback((_frame: SplatCameraFrame) => {}, []);
  const handleRecenter = useCallback(() => setResetToken((n) => n + 1), []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => controlsApiRef.current?.zoomIn(),
      zoomOut: () => controlsApiRef.current?.zoomOut(),
      recenter: () => controlsApiRef.current?.recenter(),
    }),
    [],
  );

  useEffect(() => {
    setLoadState("loading");
    setErrorMessage(null);
    setResetToken(0);

    const timeout = window.setTimeout(() => {
      setLoadState((current) => {
        if (current === "loading") {
          setErrorMessage("The model took too long to load. Check your connection and try again.");
          return "error";
        }
        return current;
      });
    }, 45_000);

    return () => window.clearTimeout(timeout);
  }, [src]);

  if (loadState === "error") {
    return (
      <div
        className={cn(
          SPLAT_VIEWER_SURFACE,
          "flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-center",
          className,
        )}
      >
        <AlertTriangle className="size-8 text-red-300" aria-hidden />
        <p className="text-sm font-medium text-red-100">Unable to load 3D model</p>
        <p className="max-w-sm text-xs text-red-200/80">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(SPLAT_VIEWER_SURFACE, "absolute inset-0", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--graphite-canvas)]/80 backdrop-blur-sm">
          <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
        </div>
      ) : null}

      <Canvas
        className="absolute inset-0 touch-none"
        style={{ width: "100%", height: "100%" }}
        resize={{ scroll: false, offsetSize: true }}
        camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <SparkSplatScene
          url={src}
          maxSplats={maxSplats}
          onReady={handleReady}
          onMeshReady={handleMeshReady}
          pickEnabled={pickEnabled}
          onPick={onPick}
          cameraMode={cameraMode}
          modelVisible={modelVisible}
          overlay={overlay}
          resetToken={resetToken}
          onDefaultFrame={handleDefaultFrame}
          controlsApiRef={controlsApiRef}
          onRecenter={handleRecenter}
        />
      </Canvas>
    </div>
  );
});
