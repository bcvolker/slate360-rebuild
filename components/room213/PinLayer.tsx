"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM213_PINS, type SpatialPin } from "@/lib/room213/pins";
import { OPEN_TOP_Y, PLAN_TOP_Y } from "@/lib/room213/scene-config";
import type { Room213View } from "@/lib/room213/edit-state";
import { plaqueTexture } from "@/components/room213/plaque-texture";

// ~1.65× the first release (physical test: too easy to miss), still clamped so plaques never dominate the room.
const TARGET_PX = 50; // plaque size on screen
const MIN_PX = 40;
const MAX_PX = 64;
const SELECTED_SCALE = 1.15; // applied INSIDE the clamp: a selected plaque never exceeds MAX_PX
// Stand-off from the surface. This capture's walls are semi-transparent layers several cm deep; at 3 cm the wall
// splats in front of the plane drew over the plaque (measured ~20 px visible, washed out). 10 cm clears them.
const SURFACE_OFFSET = 0.1;
const HIT_RADIUS_PX = 30; // ≈ 60 CSS px touch target
const tmpN = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpToCam = new THREE.Vector3();

type PinWorld = { pin: SpatialPin; world: THREE.Vector3; normal: THREE.Vector3 };

/** World-space pin anchors (file frame → scene via the file-frame group). */
function pinWorlds(group: THREE.Object3D | null): PinWorld[] {
  if (!group) return [];
  group.updateWorldMatrix(true, false);
  const nm = new THREE.Matrix3().getNormalMatrix(group.matrixWorld);
  return ROOM213_PINS.map((pin) => ({
    pin,
    world: new THREE.Vector3(...pin.position).applyMatrix4(group.matrixWorld),
    normal: new THREE.Vector3(...pin.normal).applyMatrix3(nm).normalize(),
  }));
}

/** A pin is live (drawn AND hittable) only when it faces the camera and isn't cut away by the current crop. */
function pinLive(p: PinWorld, camera: THREE.Camera, view: Room213View): boolean {
  if (view !== "walk" && p.world.y > (view === "plan" ? PLAN_TOP_Y : OPEN_TOP_Y)) return false; // cut away
  const camDir = (camera as THREE.OrthographicCamera).isOrthographicCamera
    ? camera.getWorldDirection(tmpToCam).negate()
    : tmpToCam.copy(camera.position).sub(p.world).normalize();
  return p.normal.dot(camDir) > 0.08;
}

function worldPerPixel(camera: THREE.Camera, at: THREE.Vector3, heightPx: number): number {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const o = camera as THREE.OrthographicCamera;
    return (o.top - o.bottom) / o.zoom / heightPx;
  }
  const c = camera as THREE.PerspectiveCamera;
  const d = c.position.distanceTo(at);
  return (2 * d * Math.tan(THREE.MathUtils.degToRad(c.fov) / 2)) / heightPx;
}

/** Screen-space picking for the four pins (no splat raycast; hidden/back-facing pins are not hittable). */
export function usePinPicker(view: Room213View, camera: THREE.Camera) {
  const canvas = useThree((s) => s.gl.domElement);
  const fileFrameRef = useRef<THREE.Group>(null);
  const pickPin = useCallback(
    (clientX: number, clientY: number): string | null => {
      const r = canvas.getBoundingClientRect();
      let best: { id: string; d: number } | null = null;
      for (const p of pinWorlds(fileFrameRef.current)) {
        if (!pinLive(p, camera, view)) continue;
        const q = tmpP.copy(p.world).project(camera);
        if (q.z > 1 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) continue; // off-screen pins never take a tap
        const sx = r.left + ((q.x + 1) / 2) * r.width;
        const sy = r.top + ((1 - q.y) / 2) * r.height;
        const d = Math.hypot(sx - clientX, sy - clientY);
        if (d <= HIT_RADIUS_PX && (!best || d < best.d)) best = { id: p.pin.pin_id, d };
      }
      return best?.id ?? null;
    },
    [camera, canvas, view],
  );
  // Probe-only (window.__r213 exists only with ?probe=1 / ?internal=1): live pins' screen positions for tests.
  useEffect(() => {
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (!w.__r213) return;
    w.__r213.pinScreen = () => {
      const r = canvas.getBoundingClientRect();
      return pinWorlds(fileFrameRef.current)
        .filter((p) => pinLive(p, camera, view))
        .map((p) => {
          const q = p.world.clone().project(camera);
          return { id: p.pin.pin_id, x: r.left + ((q.x + 1) / 2) * r.width, y: r.top + ((1 - q.y) / 2) * r.height, onScreen: Math.abs(q.x) < 1 && Math.abs(q.y) < 1 && q.z < 1 };
        });
    };
  });
  return { pickPin, fileFrameRef };
}

/**
 * Small plaques anchored in the capture, facing along each pin's normal. Opaque meshes: Spark draws splats after
 * opaque geometry with depth testing, so splats in front of a plaque cover it naturally (walls, furniture).
 * Screen size is clamped (MIN_PX..MAX_PX) — not physical centimetres, since the metric scale is unvalidated.
 */
export function PinLayer({ view, selected, accent, camera }: { view: Room213View; selected: string | null; accent: THREE.Color; camera: THREE.Camera }) {
  const height = useThree((s) => s.size.height);
  const refs = useRef<Record<string, THREE.Mesh | null>>({});
  const textures = useMemo(
    () => Object.fromEntries(ROOM213_PINS.map((p) => [p.pin_id, { idle: plaqueTexture(p.icon, accent, false), on: plaqueTexture(p.icon, accent, true) }])),
    [accent],
  );
  useEffect(() => () => Object.values(textures).forEach((t) => (t.idle.dispose(), t.on.dispose())), [textures]);

  useFrame(() => {
    const parent = Object.values(refs.current).find(Boolean)?.parent ?? null;
    for (const p of pinWorlds(parent)) {
      const m = refs.current[p.pin.pin_id];
      if (!m) continue;
      m.visible = pinLive(p, camera, view);
      if (!m.visible) continue;
      // Constant apparent size, eased slightly with distance (farther = a little smaller), clamped MIN..MAX px.
      const wpp = worldPerPixel(camera, p.world, height);
      const dist = camera.position.distanceTo(p.world);
      const sel = selected === p.pin.pin_id ? SELECTED_SCALE : 1;
      const px = THREE.MathUtils.clamp(TARGET_PX * sel * THREE.MathUtils.clamp(3 / Math.max(dist, 0.5), 0.72, 1.28), MIN_PX, MAX_PX);
      m.scale.setScalar(px * wpp);
      const mat = m.material as THREE.MeshBasicMaterial;
      const tex = selected === p.pin.pin_id ? textures[p.pin.pin_id].on : textures[p.pin.pin_id].idle;
      if (mat.map !== tex) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {ROOM213_PINS.map((p) => {
        const n = tmpN.set(...p.normal).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        const pos = new THREE.Vector3(...p.position).addScaledVector(n, SURFACE_OFFSET);
        return (
          <mesh
            key={p.pin_id}
            ref={(m) => {
              refs.current[p.pin_id] = m;
            }}
            position={pos}
            quaternion={q}
            renderOrder={-1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={textures[p.pin_id].idle} toneMapped={false} transparent alphaTest={0.02} />
          </mesh>
        );
      })}
    </>
  );
}
