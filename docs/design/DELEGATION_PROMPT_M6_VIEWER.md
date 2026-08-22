# Delegation Prompt — M6 Matterport-style navigation controller

Give this to another AI platform. It needs no repo access. Paste the returned code back
verbatim; it is one hook file, one component file, and one test file.

---

Write three TypeScript files for a React + Three.js walkthrough viewer. They will be dropped
into an existing Next.js app unchanged, so follow the constraints exactly.

## Hard constraints

- **TypeScript, strict mode.** No `any` unless unavoidable, and justify it in a comment.
- **React 19 + Three.js (r16x) + @react-three/fiber + @react-three/drei.** No other runtime
  dependencies. No state-management library — `useState`/`useRef`/`useCallback` only.
- **No CSS files, no styled-components, no inline hex colours.** Style with Tailwind class
  strings only, and for colours use CSS custom properties via arbitrary values, e.g.
  `text-[var(--twin360-blue)]`, `border-[var(--border)]`, `bg-[var(--background)]`.
  Never write a literal hex code.
- Every exported symbol gets a full type signature and a docstring explaining **why** it
  exists, not just what it does.
- No file over 300 lines. Split logic into the hook; keep the component presentational.
- All camera motion must be **frame-rate independent** (use delta time, never per-frame
  constants).

## What this replaces and why

The current viewer uses orbit-drag plus WASD free-flight. That is a 3D-model *inspection*
interface. This product is a *walkthrough* of a real building for contractors, and it needs
the interaction model people already know from Matterport. The existing controls are being
deleted, not extended.

## Domain model (already exists — you consume it, do not design it)

```ts
/** A capture position the operator physically stood at. */
export type WalkStation = {
  id: string;
  /** World-space position, metres, Y-up. */
  position: [number, number, number];
  /** Which floor this station belongs to; 0 is ground. */
  floorIndex: number;
  /** Optional yaw in radians the camera should face on arrival. */
  headingY?: number;
};

export type FloorInfo = {
  index: number;
  label: string;        // "Ground", "Level 2"
  elevationY: number;   // world Y of that floor's plane
};

export type ViewMode = "inside" | "dollhouse" | "floorplan";
```

## File 1 — `useWalkthroughNavigation.ts`

Export a hook:

```ts
export function useWalkthroughNavigation(options: {
  stations: WalkStation[];
  floors: FloorInfo[];
  /** Raycast against the collision mesh; returns the world hit point or null.
   *  Provided by the caller — do NOT implement raycasting yourself. */
  raycastFloor: (screenX: number, screenY: number) => [number, number, number] | null;
  initialStationId?: string;
}): {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  currentStationId: string | null;
  currentFloorIndex: number;
  setFloorIndex: (index: number) => void;
  /** Call on canvas click. Moves to the nearest station to the clicked floor point. */
  handleCanvasClick: (screenX: number, screenY: number) => void;
  /** Call from useFrame with the R3F camera and delta seconds. */
  updateCamera: (camera: THREE.Camera, delta: number) => void;
  isTransitioning: boolean;
  /** Drag to look around while standing at a station. */
  handleLookDrag: (deltaX: number, deltaY: number) => void;
};
```

Behaviour that must be exactly right:

1. **Click-to-move.** On canvas click, raycast the floor. Find the station **nearest to the
   hit point on the current floor** (ignore stations on other floors). Begin a transition to
   it. If no station is within 4 metres of the hit point, do nothing — never fly to an
   arbitrary point, because the photoreal imagery only exists at stations.
2. **Transition.** Smoothly interpolate position over ~600 ms using an ease-in-out curve
   (smoothstep is fine), at **eye height 1.6 m above the target station's floor elevation**.
   Preserve the user's current look direction unless the target station specifies `headingY`.
   `isTransitioning` is true throughout, and clicks are ignored while it is true.
3. **Look.** `handleLookDrag` adjusts yaw and pitch. **Clamp pitch to ±85°** and never roll.
   Yaw wraps. Drag must feel identical in both axes (same radians-per-pixel).
4. **Modes.**
   - `inside`: eye height at the current station.
   - `dollhouse`: camera pulled back and above, looking down at ~35°, framing the whole floor.
   - `floorplan`: directly overhead, looking straight down, orthographic-style framing.
   Switching modes animates over the same ~600 ms rather than snapping.
5. **Floor selector.** `setFloorIndex` moves to the nearest station on that floor and updates
   `currentFloorIndex`. If the floor has no stations, do nothing and leave state unchanged.
6. **Frame-rate independence.** All easing driven by accumulated delta, never by frame count.

## File 2 — `WalkthroughControls.tsx`

A presentational control bar. Props:

```ts
{
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  floors: FloorInfo[];
  currentFloorIndex: number;
  onFloorChange: (index: number) => void;
  measureActive: boolean;
  onToggleMeasure: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}
```

Requirements:
- A bottom-centred pill bar: three mode buttons (Inside / Dollhouse / Floor plan), a floor
  selector shown **only when `floors.length > 1`**, a measure toggle, a fullscreen toggle.
- The active mode is visually distinct using `--twin360-blue` via a Tailwind arbitrary value.
- Every button has an `aria-label` and `aria-pressed` where it is a toggle.
- Minimum touch target 44×44 px — this is used on phones on job sites, in gloves.
- Respect `env(safe-area-inset-bottom)` so it clears the iPhone home indicator.
- No icon library import — inline `<svg>` with `stroke="currentColor"`, 20×20, `fill="none"`.

## File 3 — `useWalkthroughNavigation.test.ts`

**Vitest** (`import { describe, it, expect, vi } from "vitest"`). Test the pure logic by
extracting it into exported helpers the hook uses internally — the hook itself is not
rendered. Export and test at minimum:

- `nearestStation(stations, point, maxDistance, floorIndex)` → nearest on that floor within
  range, or `null`. Cover: exact hit, other-floor station ignored, all-too-far returns null,
  empty list returns null.
- `smoothstep(t)` → 0 at 0, 1 at 1, 0.5 at 0.5, clamped outside [0,1].
- `clampPitch(pitch)` → clamps to ±85° expressed in radians.
- `wrapYaw(yaw)` → wraps into [-π, π].
- `eyeHeightFor(station, floors)` → floor elevation + 1.6.

At least 15 assertions total. No snapshot tests. No mocking of Three.js.

## Deliverable

Return the three complete files in full, nothing else. No prose, no partial snippets, no
"unchanged" markers. If a requirement is ambiguous, prefer the behaviour that keeps the user
standing at a real capture position — the imagery only exists there.
