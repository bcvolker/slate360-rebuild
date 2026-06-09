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
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
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
import { CameraTweenRunner } from "@/lib/digital-twin/camera-tween";
import {
  directionFromYawPitch,
  eyePositionFromHit,
  type InteriorCameraFrame,
} from "@/lib/digital-twin/interior-camera-frame";
import { frameSplatMesh, getSplatSceneBounds, type SplatCameraFrame } from "@/lib/digital-twin/splat-camera-frame";
import { raycastSplatMesh } from "@/lib/digital-twin/splat-raycast";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export const SPLAT_VIEWER_SURFACE =
  "relative min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]";

const MOBILE_MAX_SPLATS = 80_000;
const DESKTOP_MAX_SPLATS = 250_000;
const LOOK_SENSITIVITY = 0.0035;
const ZOOM_WHEEL_FACTOR = 1.08;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.4;
const TAP_DRAG_THRESHOLD_PX = 8;

type LoadState = "loading" | "ready" | "error";
export type CameraMode = "interior" | "orbit";

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

function InteriorNavigation({
  mesh,
  active,
  pickEnabled,
  onPick,
  defaultFrameRef,
  resetToken,
  zoomRef,
  onInteriorStateChange,
}: {
  mesh: SplatMesh;
  active: boolean;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  defaultFrameRef: React.MutableRefObject<InteriorCameraFrame | null>;
  resetToken: number;
  zoomRef: React.MutableRefObject<number>;
  onInteriorStateChange: (frame: InteriorCameraFrame, zoom: number) => void;
}) {
  const { camera, gl } = useThree();
  const boundsRef = useRef<THREE.Box3 | null>(null);
  const stateRef = useRef({ yaw: 0, pitch: 0, position: new THREE.Vector3() });
  const tweenRef = useRef(new CameraTweenRunner());
  const pointerRef = useRef({
    dragging: false,
    moved: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    pinchActive: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
  });
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const tweenScratch = useMemo(
    () => ({ position: new THREE.Vector3(), yaw: 0, pitch: 0 }),
    [],
  );

  const applyStateToCamera = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const { position, yaw, pitch } = stateRef.current;
    camera.position.copy(position);
    directionFromYawPitch(yaw, pitch, forward);
    lookTarget.copy(position).add(forward);
    camera.lookAt(lookTarget);
  }, [camera, forward, lookTarget]);

  const syncDefaultFrame = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !mesh?.isInitialized) return;
    const frame = frameSplatMesh(mesh, camera, null);
    defaultFrameRef.current = frame;
    boundsRef.current = getSplatSceneBounds(mesh);
    stateRef.current.position.copy(frame.position);
    stateRef.current.yaw = frame.yaw;
    stateRef.current.pitch = frame.pitch;
    zoomRef.current = frame.zoom;
    tweenRef.current.cancel();
    applyStateToCamera();
    onInteriorStateChange(frame, zoomRef.current);
  }, [applyStateToCamera, camera, defaultFrameRef, mesh, onInteriorStateChange, zoomRef]);

  useEffect(() => {
    if (!active || !mesh?.isInitialized) return;
    syncDefaultFrame();
  }, [active, mesh, syncDefaultFrame]);

  useEffect(() => {
    if (!active || resetToken <= 0) return;
    syncDefaultFrame();
  }, [active, resetToken, syncDefaultFrame]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
      zoomRef.current = THREE.MathUtils.clamp(zoomRef.current * factor, MIN_ZOOM, MAX_ZOOM);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      pointerRef.current.dragging = true;
      pointerRef.current.moved = false;
      pointerRef.current.pointerId = event.pointerId;
      pointerRef.current.lastX = event.clientX;
      pointerRef.current.lastY = event.clientY;

      if (event.pointerType === "touch" && (event as PointerEvent & { isPrimary?: boolean }).isPrimary !== false) {
        // pinch handled on move with second touch
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" && event.isPrimary === false) return;

      if (pointerRef.current.pinchActive && event.pointerType === "touch") {
        return;
      }

      if (!pointerRef.current.dragging || event.pointerId !== pointerRef.current.pointerId) return;

      const dx = event.clientX - pointerRef.current.lastX;
      const dy = event.clientY - pointerRef.current.lastY;
      if (Math.hypot(dx, dy) > TAP_DRAG_THRESHOLD_PX) {
        pointerRef.current.moved = true;
        tweenRef.current.cancel();
      }

      pointerRef.current.lastX = event.clientX;
      pointerRef.current.lastY = event.clientY;

      if (!pointerRef.current.moved) return;

      stateRef.current.yaw -= dx * LOOK_SENSITIVITY;
      stateRef.current.pitch = THREE.MathUtils.clamp(
        stateRef.current.pitch - dy * LOOK_SENSITIVITY,
        -Math.PI / 2 + 0.1,
        Math.PI / 2 - 0.1,
      );
      applyStateToCamera();
    };

    const navigateToHit = (clientX: number, clientY: number) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const hit = raycastSplatMesh(mesh, camera, clientX, clientY, canvas);
      if (!hit) return;

      if (pickEnabled && onPick) {
        onPick({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
        return;
      }

      const floorY = boundsRef.current?.min.y ?? hit.point.y - 1.6;
      const destination = eyePositionFromHit(hit.point, floorY, camera.position);

      tweenRef.current.start(
        {
          position: stateRef.current.position.clone(),
          yaw: stateRef.current.yaw,
          pitch: stateRef.current.pitch,
        },
        {
          position: destination,
          yaw: stateRef.current.yaw,
          pitch: 0,
        },
      );
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerRef.current.pointerId) return;

      const wasTap = pointerRef.current.dragging && !pointerRef.current.moved;
      pointerRef.current.dragging = false;
      pointerRef.current.pointerId = -1;

      if (wasTap) {
        navigateToHit(event.clientX, event.clientY);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pointerRef.current.pinchActive = true;
        pointerRef.current.pinchStartDistance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY,
        );
        pointerRef.current.pinchStartZoom = zoomRef.current;
        pointerRef.current.dragging = false;
        pointerRef.current.moved = true;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pointerRef.current.pinchActive || event.touches.length < 2) return;
      event.preventDefault();
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
      const ratio = distance / Math.max(pointerRef.current.pinchStartDistance, 1);
      zoomRef.current = THREE.MathUtils.clamp(
        pointerRef.current.pinchStartZoom / ratio,
        MIN_ZOOM,
        MAX_ZOOM,
      );
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pointerRef.current.pinchActive = false;
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      pointerRef.current.dragging = false;
      pointerRef.current.pinchActive = false;
    };
  }, [active, applyStateToCamera, camera, forward, gl, mesh, onPick, pickEnabled, zoomRef]);

  useFrame(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera)) return;

    if (tweenRef.current.step(performance.now(), tweenScratch)) {
      stateRef.current.position.copy(tweenScratch.position);
      stateRef.current.yaw = tweenScratch.yaw;
      stateRef.current.pitch = tweenScratch.pitch;
      applyStateToCamera();
    }

    const baseFov = 60;
    camera.fov = THREE.MathUtils.clamp(baseFov / zoomRef.current, 25, 85);
    camera.updateProjectionMatrix();
  });

  return null;
}

function SplatCameraController({
  mesh,
  resetToken,
  onDefaultFrame,
  cameraMode,
}: {
  mesh: SplatMesh | null;
  resetToken: number;
  onDefaultFrame: (frame: SplatCameraFrame) => void;
  cameraMode: CameraMode;
}) {
  const { camera, controls } = useThree();
  const framedRef = useRef(false);

  useEffect(() => {
    framedRef.current = false;
  }, [mesh]);

  const applyDefaultFrame = useCallback(() => {
    if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (cameraMode !== "orbit") return;
    const orbit = controls as OrbitControlsImpl | null;
    const frame = frameSplatMesh(mesh, camera, orbit);
    onDefaultFrame(frame);
  }, [mesh, camera, controls, onDefaultFrame, cameraMode]);

  useEffect(() => {
    if (!mesh?.isInitialized || framedRef.current || cameraMode !== "orbit") return;
    const id = window.requestAnimationFrame(() => {
      framedRef.current = true;
      applyDefaultFrame();
    });
    return () => window.cancelAnimationFrame(id);
  }, [mesh, applyDefaultFrame, cameraMode]);

  useEffect(() => {
    if (resetToken <= 0 || cameraMode !== "orbit") return;
    applyDefaultFrame();
  }, [resetToken, applyDefaultFrame, cameraMode]);

  return null;
}

function ControlsBridge({
  apiRef,
  cameraMode,
  onRecenter,
  zoomRef,
}: {
  apiRef: React.MutableRefObject<SplatViewerHandle | null>;
  cameraMode: CameraMode;
  onRecenter: () => void;
  zoomRef: React.MutableRefObject<number>;
}) {
  const { controls } = useThree();
  const orbit = controls as OrbitControlsImpl | null;

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyIn(1.2);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(zoomRef.current / ZOOM_WHEEL_FACTOR, MIN_ZOOM, MAX_ZOOM);
      },
      zoomOut: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyOut(1.2);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(zoomRef.current * ZOOM_WHEEL_FACTOR, MIN_ZOOM, MAX_ZOOM);
      },
      recenter: onRecenter,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, cameraMode, orbit, onRecenter, zoomRef]);

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
  defaultFrameRef,
  zoomRef,
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
  defaultFrameRef: React.MutableRefObject<InteriorCameraFrame | null>;
  zoomRef: React.MutableRefObject<number>;
}) {
  const gl = useThree((state) => state.gl);
  const meshRef = useRef<SplatMesh>(null);
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
        meshRef.current = mesh;
        onMeshReady(mesh);
        setLoadedMesh(mesh);
        onReady();
      },
    }),
    [url, maxSplats, onMeshReady, onReady],
  );

  useEffect(() => {
    if (!loadedMesh) return;
    loadedMesh.raycastable = true;
  }, [loadedMesh]);

  const handleInteriorStateChange = useCallback(
    (_frame: InteriorCameraFrame, _zoom: number) => {},
    [],
  );

  return (
    <>
      <group visible={modelVisible}>
        <sparkRenderer args={[sparkArgs]}>
          <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
      {loadedMesh ? (
        <>
          <SplatCameraController
            mesh={loadedMesh}
            resetToken={resetToken}
            onDefaultFrame={onDefaultFrame}
            cameraMode={cameraMode}
          />
          {cameraMode === "interior" ? (
            <InteriorNavigation
              mesh={loadedMesh}
              active
              pickEnabled={pickEnabled}
              onPick={onPick}
              defaultFrameRef={defaultFrameRef}
              resetToken={resetToken}
              zoomRef={zoomRef}
              onInteriorStateChange={handleInteriorStateChange}
            />
          ) : null}
        </>
      ) : null}
      {overlay}
      <ControlsBridge
        apiRef={controlsApiRef}
        cameraMode={cameraMode}
        onRecenter={onRecenter}
        zoomRef={zoomRef}
      />
      {cameraMode === "orbit" ? (
        <OrbitControls makeDefault enablePan enableZoom enableRotate />
      ) : null}
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
    cameraMode = "interior",
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
  const defaultFrameRef = useRef<InteriorCameraFrame | null>(null);
  const zoomRef = useRef(1);

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
    zoomRef.current = 1;

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
          defaultFrameRef={defaultFrameRef}
          zoomRef={zoomRef}
        />
      </Canvas>
    </div>
  );
});
