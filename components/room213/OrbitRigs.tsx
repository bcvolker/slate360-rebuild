"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { FLOOR_Y, OPEN_TOP_Y, ROOM } from "@/lib/room213/scene-config";
import type { CameraPose } from "@/lib/room213/hero";

export type SavedOrbitPose = CameraPose & { userMoved: boolean; aspectClass: "landscape" | "portrait" };

/** Click (not drag) detection on the canvas for pin picking under orbit controls. */
function useTapPick(pickPin: (x: number, y: number) => string | null, onPin: (id: string) => void, onActivity: () => void) {
  const canvas = useThree((s) => s.gl.domElement);
  const cb = useRef({ pickPin, onPin, onActivity });
  cb.current = { pickPin, onPin, onActivity };
  useEffect(() => {
    let start: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      start = { id: e.pointerId, x: e.clientX, y: e.clientY };
      cb.current.onActivity();
    };
    const up = (e: PointerEvent) => {
      if (!start || start.id !== e.pointerId) return;
      const tap = Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6;
      start = null;
      if (!tap) return;
      const id = cb.current.pickPin(e.clientX, e.clientY);
      if (id) cb.current.onPin(id);
    };
    const wheel = () => cb.current.onActivity();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [canvas]);
}

const ROOM_CENTER = ROOM.getCenter(new THREE.Vector3());
const ROOM_RADIUS = ROOM.getSize(new THREE.Vector3()).length() / 2;
const TARGET_BOX = new THREE.Box3(
  new THREE.Vector3(ROOM.min.x + 1, FLOOR_Y, ROOM.min.z + 1),
  new THREE.Vector3(ROOM.max.x - 1, OPEN_TOP_Y, ROOM.max.z - 1),
);

/**
 * Dollhouse: familiar orbit (drag = orbit, wheel/pinch = zoom, right-drag/two-finger = pan), bounded so the camera
 * can't dive under the floor, leave the room far behind, or lose its target outside the room.
 */
export function DollhouseRig({
  camera,
  home,
  aspectClass,
  pickPin,
  onPin,
  onActivity,
  poseOut,
}: {
  /** The scene's perspective camera (explicit — never whatever happens to be the default camera). */
  camera: THREE.PerspectiveCamera;
  home: CameraPose;
  aspectClass: "landscape" | "portrait";
  pickPin: (x: number, y: number) => string | null;
  onPin: (id: string) => void;
  onActivity: () => void;
  poseOut: { current: SavedOrbitPose | null };
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  useTapPick(pickPin, onPin, onActivity);

  // Canonical entry: the aspect-correct hero, unless the user moved the Dollhouse camera in THIS aspect class.
  // World-up is re-established on every entry (the camera is shared with Walk).
  useLayoutEffect(() => {
    const saved = poseOut.current;
    const start = saved?.userMoved && saved.aspectClass === aspectClass ? saved : home;
    camera.up.set(0, 1, 0);
    camera.position.copy(start.position);
    camera.fov = start.fov;
    camera.near = 0.05;
    camera.updateProjectionMatrix();
    camera.lookAt(start.target);
    const c = controls.current;
    if (c) {
      c.target.copy(start.target);
      c.update();
    }
  }, [camera, home, aspectClass]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    c.target.clamp(TARGET_BOX.min, TARGET_BOX.max);
    const userMoved = poseOut.current?.userMoved ?? false;
    poseOut.current = { position: camera.position.clone(), target: c.target.clone(), fov: camera.fov, userMoved, aspectClass };
  });
  const onStart = () => {
    if (poseOut.current) poseOut.current.userMoved = true;
    onActivity();
  };

  return (
    <OrbitControls
      ref={controls}
      camera={camera}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      minDistance={ROOM_RADIUS * 0.45}
      // Never below the hero's own distance: portrait heroes sit farther out, and a smaller cap silently pulled the
      // camera in (clipping the room on phones).
      maxDistance={Math.max(ROOM_RADIUS * 2.6, home.position.distanceTo(home.target) * 1.3)}
      minPolarAngle={THREE.MathUtils.degToRad(8)}
      maxPolarAngle={THREE.MathUtils.degToRad(78)}
      screenSpacePanning={false}
      onStart={onStart}
    />
  );
}

/** Canonical Plan framing: centred on the room, zoomed to fit, room x left→right (screen-up = −z). */
export function planFit(width: number, height: number) {
  const roomSize = ROOM.getSize(new THREE.Vector3());
  return Math.min(width / (roomSize.x * 1.12), height / (roomSize.z * 1.12));
}

/**
 * Plan view: a true orthographic top-down camera over the same scene (Spark projects orthographic cameras
 * natively). Pan + zoom only, with a purpose-built controller: the camera's orientation is a constant and nothing
 * is written unless the user moves it. (OrbitControls re-derived the straight-down pose through spherical
 * coordinates every frame; the float drift made Spark see a "new view" and re-sort continuously.)
 */
export function PlanRig({
  camera,
  pickPin,
  onPin,
  onActivity,
}: {
  camera: THREE.OrthographicCamera;
  pickPin: (x: number, y: number) => string | null;
  onPin: (id: string) => void;
  onActivity: () => void;
}) {
  const size = useThree((s) => s.size);
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  useTapPick(pickPin, onPin, onActivity);
  const fitZoom = planFit(size.width, size.height);

  useLayoutEffect(() => {
    camera.up.set(0, 0, -1);
    camera.position.set(ROOM_CENTER.x, 40, ROOM_CENTER.z);
    camera.zoom = fitZoom;
    camera.lookAt(ROOM_CENTER.x, FLOOR_Y, ROOM_CENTER.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }, [camera, fitZoom]);

  useEffect(() => {
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const clampPan = () => {
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, ROOM.min.x, ROOM.max.x);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, ROOM.min.z, ROOM.max.z);
    };
    const apply = () => {
      clampPan();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      invalidate();
      onActivity();
    };
    const zoomBy = (k: number) => {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * k, fitZoom * 0.8, fitZoom * 6);
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size === 1) {
        // screen right = +x, screen up = −z (camera up is −z); pixels → world via zoom
        camera.position.x -= (cur.x - prev.x) / camera.zoom;
        camera.position.z -= (cur.y - prev.y) / camera.zoom;
        apply();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) zoomBy(d / pinch);
        pinch = d;
        apply();
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
      apply();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [camera, canvas, fitZoom, invalidate, onActivity]);

  return null;
}
