"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CameraTweenRunner, type CameraTweenTarget } from "@/lib/digital-twin/camera-tween";
import { EYE_Y, FLOOR_Y } from "@/lib/room213/scene-config";
import { slideMove, walkableAlong } from "@/lib/room213/walk-area";
import { rehomeWalk, walkEntryPose } from "@/components/room213/walk-entry";
import {
  LOOK_STICK_PITCH, LOOK_STICK_YAW, STICK_EASE, MAX_TAP_STEP, PITCH_LIMIT, TURN_SPEED, WALK_KEYS, WALK_SPEED, WHEEL_UNITS_PER_NOTCH,
  clearWalkInput, groundForward, walkAxes, type WalkInput,
} from "@/components/room213/walk-input";

/** `epoch` increments on every authoritative jump (Reset, View in room); the rig then cancels any step in flight. */
export type WalkPose = { position: THREE.Vector3; yaw: number; pitch: number; epoch: number };

const WALK_FOV = 62;
const LOOK_MOUSE = 0.0042;
const LOOK_TOUCH = 0.0065;
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
const hitPoint = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

/**
 * Walk navigation (V frame). Drag = look; click/tap a valid floor point = bounded step along the walkable area;
 * wheel / W S ↑ ↓ = forward/back; A D = strafe; ← → = turn; joystick axes from `input.stick`. Movement is always
 * horizontal (yaw only) at eye height, so looking up never flies. Any direct input cancels a running step.
 */
export function WalkRig({
  camera,
  pose,
  input,
  keyTarget,
  pickPin,
  onPin,
  onActivity,
  accent,
}: {
  /** The scene's perspective camera (explicit). Walk writes yaw/pitch/position only; roll is always 0. */
  camera: THREE.PerspectiveCamera;
  pose: WalkPose;
  input: WalkInput;
  keyTarget: HTMLElement | null;
  pickPin: (clientX: number, clientY: number) => string | null;
  onPin: (id: string) => void;
  onActivity: () => void;
  accent: THREE.Color;
}) {
  const canvas = useThree((s) => s.gl.domElement);
  const tween = useRef(new CameraTweenRunner());
  const scratch = useRef<CameraTweenTarget>({ position: new THREE.Vector3(), yaw: 0, pitch: 0 });
  const marker = useRef<THREE.Mesh>(null);
  const markerUntil = useRef(0);
  const seenEpoch = useRef(pose.epoch);
  const cb = useRef({ pickPin, onPin, onActivity });
  cb.current = { pickPin, onPin, onActivity };

  useEffect(() => {
    camera.up.set(0, 1, 0);
    camera.fov = WALK_FOV;
    camera.near = 0.2; // splats closer than this to the eye render as huge dark smears; cull them in Walk
    camera.updateProjectionMatrix();
  }, [camera]);

  const floorTarget = useMemo(
    () => (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(floorPlane, hitPoint)) return null;
      const dx = hitPoint.x - pose.position.x;
      const dz = hitPoint.z - pose.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) return null;
      const k = Math.min(1, MAX_TAP_STEP / d);
      const end = walkableAlong(pose.position.x, pose.position.z, pose.position.x + dx * k, pose.position.z + dz * k);
      if (!end || Math.hypot(end.x - pose.position.x, end.z - pose.position.z) < 0.15) return null;
      return end;
    },
    [camera, canvas, pose],
  );

  const showMarker = (x: number, z: number, ms: number) => {
    const m = marker.current;
    if (!m) return;
    m.position.set(x, FLOOR_Y + 0.02, z);
    m.visible = true;
    markerUntil.current = performance.now() + ms;
  };

  useEffect(() => {
    let drag: { id: number; x: number; y: number; moved: boolean; touch: boolean } | null = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || drag) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType !== "mouse" };
      canvas.setPointerCapture(e.pointerId);
      cb.current.onActivity();
    };
    const move = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < (drag.touch ? 10 : 5)) return;
        if (!drag.moved) canvas.style.cursor = "grabbing";
        drag.moved = true;
        tween.current.cancel();
        const s = drag.touch ? LOOK_TOUCH : LOOK_MOUSE;
        pose.yaw += dx * s;
        pose.pitch = THREE.MathUtils.clamp(pose.pitch + dy * s, -PITCH_LIMIT, PITCH_LIMIT);
        drag.x = e.clientX;
        drag.y = e.clientY;
        return;
      }
      if (e.pointerType === "mouse" && !drag) {
        const t = floorTarget(e.clientX, e.clientY);
        canvas.style.cursor = t ? "pointer" : "grab";
        if (t) showMarker(t.x, t.z, 120);
      }
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasTap = !drag.moved;
      drag = null;
      canvas.style.cursor = "grab";
      if (!wasTap || input.stick.active || input.look.active) return;
      const pin = cb.current.pickPin(e.clientX, e.clientY);
      if (pin) {
        cb.current.onPin(pin);
        return;
      }
      const t = floorTarget(e.clientX, e.clientY);
      if (!t) return;
      showMarker(t.x, t.z, 700);
      const dist = Math.hypot(t.x - pose.position.x, t.z - pose.position.z);
      tween.current.start(
        { position: pose.position, yaw: pose.yaw, pitch: pose.pitch },
        { position: new THREE.Vector3(t.x, EYE_Y, t.z), yaw: pose.yaw, pitch: pose.pitch },
        THREE.MathUtils.clamp(dist * 240, 260, 700),
      );
    };
    const cancel = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // browser zoom
      e.preventDefault();
      tween.current.cancel();
      const notches = e.deltaMode === 1 ? e.deltaY / 3 : e.deltaY / 100;
      input.wheel = THREE.MathUtils.clamp(input.wheel - notches * WHEEL_UNITS_PER_NOTCH, -1.5, 1.5);
      cb.current.onActivity();
    };
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("wheel", wheel);
      canvas.style.cursor = "";
    };
  }, [canvas, floorTarget, input, pose]);

  useEffect(() => {
    if (!keyTarget) return;
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const kd = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (!WALK_KEYS.has(k)) return;
      e.preventDefault();
      tween.current.cancel();
      input.keys.add(k);
      cb.current.onActivity();
    };
    const ku = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
    const clear = () => clearWalkInput(input);
    keyTarget.addEventListener("keydown", kd);
    keyTarget.addEventListener("keyup", ku);
    keyTarget.addEventListener("focusout", clear);
    window.addEventListener("blur", clear);
    return () => {
      keyTarget.removeEventListener("keydown", kd);
      keyTarget.removeEventListener("keyup", ku);
      keyTarget.removeEventListener("focusout", clear);
      window.removeEventListener("blur", clear);
      clearWalkInput(input);
    };
  }, [keyTarget, input]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const now = performance.now();
    if (pose.epoch !== seenEpoch.current) {
      // A jump happened (Reset / View in room): it wins over any step tween or held input.
      seenEpoch.current = pose.epoch;
      tween.current.cancel();
      clearWalkInput(input);
      if (marker.current) marker.current.visible = false;
    }
    if (tween.current.isRunning()) {
      if (input.stick.active) tween.current.cancel();
      else {
        tween.current.step(now, scratch.current);
        pose.position.copy(scratch.current.position);
        pose.yaw = scratch.current.yaw;
        pose.pitch = scratch.current.pitch;
      }
    }
    if (!tween.current.isRunning()) {
      // Ease both sticks toward the thumb (smooth start/stop, no jerks); released sticks glide to rest.
      const k = 1 - Math.exp(-STICK_EASE * dt);
      const se = (input.stickEased ??= { x: 0, y: 0 });
      const le = (input.lookEased ??= { x: 0, y: 0 });
      se.x += ((input.stick.active ? input.stick.x : 0) - se.x) * k;
      se.y += ((input.stick.active ? input.stick.y : 0) - se.y) * k;
      le.x += ((input.look.active ? input.look.x : 0) - le.x) * k;
      le.y += ((input.look.active ? input.look.y : 0) - le.y) * k;
      if (Math.abs(se.x) + Math.abs(se.y) < 1e-3) se.x = se.y = 0;
      if (Math.abs(le.x) + Math.abs(le.y) < 1e-3) le.x = le.y = 0;
      const { forward, strafe, turn } = walkAxes(input);
      pose.yaw += turn * TURN_SPEED * dt;
      // Right joystick: right = turn right (yaw decreases), up = look up; squared response for fine aiming.
      pose.yaw -= Math.sign(le.x) * le.x ** 2 * LOOK_STICK_YAW * dt;
      pose.pitch = THREE.MathUtils.clamp(pose.pitch + Math.sign(le.y) * le.y ** 2 * LOOK_STICK_PITCH * dt, -PITCH_LIMIT, PITCH_LIMIT);
      const w = input.wheel * Math.min(1, dt * 9);
      input.wheel -= w;
      if (Math.abs(input.wheel) < 1e-3) input.wheel = 0;
      groundForward(pose.yaw, fwd);
      right.set(-fwd.z, 0, fwd.x);
      const mx = (fwd.x * forward + right.x * strafe) * WALK_SPEED * dt + fwd.x * w;
      const mz = (fwd.z * forward + right.z * strafe) * WALK_SPEED * dt + fwd.z * w;
      if (mx !== 0 || mz !== 0) {
        const next = slideMove(pose.position.x, pose.position.z, mx, mz);
        pose.position.x = next.x;
        pose.position.z = next.z;
      }
      pose.position.y = EYE_Y;
    }
    if (!Number.isFinite(pose.yaw) || !Number.isFinite(pose.pitch) || !Number.isFinite(pose.position.x) || !Number.isFinite(pose.position.z)) {
      rehomeWalk(pose, walkEntryPose()); // never let a bad value strand the camera
    }
    pose.position.y = EYE_Y;
    camera.up.set(0, 1, 0);
    camera.position.copy(pose.position);
    camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ"); // world-up, zero roll, every frame
    if (marker.current?.visible && now > markerUntil.current) marker.current.visible = false;
  });

  return (
    <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={2}>
      <ringGeometry args={[0.13, 0.17, 40]} />
      <meshBasicMaterial color={accent} transparent opacity={0.85} depthTest={false} toneMapped={false} />
    </mesh>
  );
}
