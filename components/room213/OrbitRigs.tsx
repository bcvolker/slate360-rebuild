"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { FLOOR_Y, OPEN_TOP_Y, ROOM } from "@/lib/room213/scene-config";
import type { CameraPose } from "@/lib/room213/hero";

export type SavedOrbitPose = CameraPose & { userMoved: boolean };

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
  home,
  pickPin,
  onPin,
  onActivity,
  poseOut,
}: {
  home: CameraPose;
  pickPin: (x: number, y: number) => string | null;
  onPin: (id: string) => void;
  onActivity: () => void;
  poseOut: { current: SavedOrbitPose | null };
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);
  useTapPick(pickPin, onPin, onActivity);

  // Restore the user's own Dollhouse pose if they moved it; otherwise (first entry, or the viewport changed
  // aspect before any interaction — e.g. canvas sizing, orientation) frame the aspect-correct hero.
  useEffect(() => {
    const saved = poseOut.current;
    const start = saved?.userMoved ? saved : home;
    camera.position.copy(start.position);
    camera.fov = start.fov;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(start.target);
    controls.current?.update();
  }, [camera, home]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    c.target.clamp(TARGET_BOX.min, TARGET_BOX.max);
    const userMoved = poseOut.current?.userMoved ?? false;
    poseOut.current = { position: camera.position.clone(), target: c.target.clone(), fov: camera.fov, userMoved };
  });
  const onStart = () => {
    if (poseOut.current) poseOut.current.userMoved = true;
    onActivity();
  };

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      minDistance={ROOM_RADIUS * 0.45}
      maxDistance={ROOM_RADIUS * 2.6}
      minPolarAngle={THREE.MathUtils.degToRad(8)}
      maxPolarAngle={THREE.MathUtils.degToRad(78)}
      screenSpacePanning={false}
      onStart={onStart}
    />
  );
}

/**
 * Plan view: a true orthographic top-down camera over the same scene (Spark projects orthographic cameras
 * natively). Pan + zoom only — no orbit, no tilt. Room x runs left→right.
 */
export function PlanRig({
  pickPin,
  onPin,
  onActivity,
}: {
  pickPin: (x: number, y: number) => string | null;
  onPin: (id: string) => void;
  onActivity: () => void;
}) {
  const size = useThree((s) => s.size);
  const controls = useRef<OrbitControlsImpl>(null);
  useTapPick(pickPin, onPin, onActivity);
  const roomSize = ROOM.getSize(new THREE.Vector3());
  const fitZoom = Math.min(size.width / (roomSize.x * 1.12), size.height / (roomSize.z * 1.12));

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[ROOM_CENTER.x, 40, ROOM_CENTER.z]}
        up={[0, 0, -1]}
        zoom={fitZoom}
        near={0.1}
        far={200}
        onUpdate={(c) => c.lookAt(ROOM_CENTER.x, FLOOR_Y, ROOM_CENTER.z)}
      />
      <OrbitControls
        ref={controls}
        makeDefault
        target={[ROOM_CENTER.x, FLOOR_Y, ROOM_CENTER.z]}
        enableRotate={false}
        enableDamping
        dampingFactor={0.15}
        screenSpacePanning
        minZoom={fitZoom * 0.8}
        maxZoom={fitZoom * 6}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        onStart={onActivity}
        onChange={() => {
          const c = controls.current;
          if (!c) return;
          // Keep the room on screen: clamp the pan target, moving the camera with it (no tilt introduced).
          const dx = THREE.MathUtils.clamp(c.target.x, ROOM.min.x, ROOM.max.x) - c.target.x;
          const dz = THREE.MathUtils.clamp(c.target.z, ROOM.min.z, ROOM.max.z) - c.target.z;
          if (dx !== 0 || dz !== 0) {
            c.target.x += dx;
            c.target.z += dz;
            c.object.position.x += dx;
            c.object.position.z += dz;
          }
        }}
      />
    </>
  );
}
