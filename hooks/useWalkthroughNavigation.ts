"use client";

/**
 * M6 — Matterport-style walkthrough navigation.
 *
 * Replaces orbit-drag + WASD free-flight. That is a model-INSPECTION interface;
 * this is a walkthrough of a real building, and the imagery only exists where
 * the operator stood. So: click the floor, walk to the nearest capture station,
 * drag to look around. Never fly to an arbitrary point.
 *
 * All easing is driven by accumulated delta seconds, so motion is identical at
 * 30 fps on a job-site phone and 120 fps on a desktop.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import {
  clampPitch,
  lerpPose,
  MAX_CLICK_DISTANCE_M,
  nearestStation,
  poseForMode,
  TRANSITION_MS,
  wrapYaw,
  type FloorInfo,
  type ViewMode,
  type WalkPose,
  type WalkStation,
} from "@/lib/digital-twin/walkthrough-navigation";

/** Radians of rotation per pixel dragged — identical in both axes so the
 *  gesture feels the same horizontally and vertically. */
const LOOK_SENSITIVITY = 0.005;

/** Minimal structural type for the camera, so this hook does not import
 *  three.js and can be tested without a WebGL context. */
// Declared with METHOD syntax, not arrow properties: methods are checked
// bivariantly, so three.js's narrower `EulerOrder` parameter still satisfies
// this shape. Arrow-property syntax is strictly contravariant and would reject
// the real camera.
type CameraLike = {
  position: { set(x: number, y: number, z: number): unknown };
  rotation: { set(x: number, y: number, z: number, order?: string): unknown };
};

export type WalkthroughNavigation = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  currentStationId: string | null;
  currentFloorIndex: number;
  setFloorIndex: (index: number) => void;
  /** Call on canvas click. Walks to the nearest station to the clicked point. */
  handleCanvasClick: (screenX: number, screenY: number) => void;
  /** Call from useFrame with the R3F camera and delta seconds. */
  updateCamera: (camera: CameraLike, delta: number) => void;
  isTransitioning: boolean;
  /** Drag to look around while standing at a station. */
  handleLookDrag: (deltaX: number, deltaY: number) => void;
};

export function useWalkthroughNavigation(options: {
  stations: WalkStation[];
  floors: FloorInfo[];
  /** Raycast against the collision mesh; returns the world hit point or null.
   *  Supplied by the caller — this hook deliberately owns no scene graph. */
  raycastFloor: (screenX: number, screenY: number) => [number, number, number] | null;
  initialStationId?: string;
}): WalkthroughNavigation {
  const { stations, floors, raycastFloor, initialStationId } = options;

  const initial = useMemo(
    () => stations.find((s) => s.id === initialStationId) ?? stations[0] ?? null,
    [stations, initialStationId],
  );

  const [mode, setModeState] = useState<ViewMode>("inside");
  const [currentStationId, setCurrentStationId] = useState<string | null>(initial?.id ?? null);
  const [currentFloorIndex, setCurrentFloorIndex] = useState<number>(initial?.floorIndex ?? 0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Live pose lives in refs, not state: it changes every frame and must never
  // trigger a React render.
  const poseRef = useRef<WalkPose>({
    position: initial
      ? [initial.position[0], initial.position[1] + 1.6, initial.position[2]]
      : [0, 1.6, 0],
    yaw: initial?.headingY ?? 0,
    pitch: 0,
  });
  const fromRef = useRef<WalkPose | null>(null);
  const toRef = useRef<WalkPose | null>(null);
  const elapsedRef = useRef(0);

  const beginTransition = useCallback((target: WalkPose | null) => {
    if (!target) return;
    fromRef.current = { ...poseRef.current, position: [...poseRef.current.position] };
    toRef.current = target;
    elapsedRef.current = 0;
    setIsTransitioning(true);
  }, []);

  const setMode = useCallback(
    (next: ViewMode) => {
      const station = stations.find((s) => s.id === currentStationId) ?? null;
      const target = poseForMode(
        next,
        station,
        floors,
        stations,
        currentFloorIndex,
        poseRef.current.yaw,
      );
      if (!target) return;
      setModeState(next);
      beginTransition(target);
    },
    [beginTransition, currentFloorIndex, currentStationId, floors, stations],
  );

  const goToStation = useCallback(
    (station: WalkStation) => {
      const target = poseForMode(
        mode === "inside" ? "inside" : mode,
        station,
        floors,
        stations,
        station.floorIndex,
        poseRef.current.yaw,
      );
      if (!target) return;
      setCurrentStationId(station.id);
      setCurrentFloorIndex(station.floorIndex);
      beginTransition(target);
    },
    [beginTransition, floors, mode, stations],
  );

  const handleCanvasClick = useCallback(
    (screenX: number, screenY: number) => {
      if (isTransitioning) return;
      const hit = raycastFloor(screenX, screenY);
      if (!hit) return;
      const station = nearestStation(stations, hit, MAX_CLICK_DISTANCE_M, currentFloorIndex);
      if (!station) return;
      goToStation(station);
    },
    [currentFloorIndex, goToStation, isTransitioning, raycastFloor, stations],
  );

  const setFloorIndex = useCallback(
    (index: number) => {
      if (index === currentFloorIndex) return;
      const here = poseRef.current.position;
      const target =
        nearestStation(stations, here, Number.POSITIVE_INFINITY, index) ?? null;
      // No stations on that floor — leave every piece of state untouched
      // rather than stranding the camera somewhere with no imagery.
      if (!target) return;
      goToStation(target);
    },
    [currentFloorIndex, goToStation, stations],
  );

  const handleLookDrag = useCallback(
    (deltaX: number, deltaY: number) => {
      if (isTransitioning) return;
      const pose = poseRef.current;
      pose.yaw = wrapYaw(pose.yaw - deltaX * LOOK_SENSITIVITY);
      pose.pitch = clampPitch(pose.pitch - deltaY * LOOK_SENSITIVITY);
    },
    [isTransitioning],
  );

  const updateCamera = useCallback((camera: CameraLike, delta: number) => {
    const from = fromRef.current;
    const to = toRef.current;
    if (from && to) {
      elapsedRef.current += delta * 1000;
      const t = Math.min(1, elapsedRef.current / TRANSITION_MS);
      poseRef.current = lerpPose(from, to, t);
      if (t >= 1) {
        fromRef.current = null;
        toRef.current = null;
        setIsTransitioning(false);
      }
    }
    const pose = poseRef.current;
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    // YXZ so yaw is applied about world up and pitch about the camera's own
    // right axis — the combination that cannot introduce roll.
    camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
  }, []);

  return {
    mode,
    setMode,
    currentStationId,
    currentFloorIndex,
    setFloorIndex,
    handleCanvasClick,
    updateCamera,
    isTransitioning,
    handleLookDrag,
  };
}
