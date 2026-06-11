# Twin Viewer Navigation Spec — gold-standard controls (mobile + desktop)

> Research-backed spec for Slate360's twin viewer (exterior + interior). Sources: Matterport
> Showcase conventions, PlayCanvas SuperSplat camera controls, NN/g virtual-tour usability
> research. Builds on the shipped framing work (percentile-trimmed bounds,
> `applyOverviewHomeFrame()`, orbit clamps, auto-glide home).

## The gold standard in one sentence

Two explicit modes — **Orbit** (inspect the model) and **Walk** (move through it) — with the
same gestures meaning the same thing on mouse and touch, a always-visible **Home** reset, and
the camera never able to get lost. Matterport for interiors + SuperSplat/PlayCanvas for
splat-specific control mapping are the references.

## Opening framing (locked requirements)

1. **Ground level, right side up.** Apply gravity alignment from capture orientation
   (orientation "up" already set in the Splatfacto pipeline); never open tilted.
2. **Proper size:** exterior overview at ~60% viewport fill (shipped), camera slightly above
   horizon (~15–20° elevation), looking at the model centroid of percentile-trimmed bounds.
3. Open in **Orbit** mode always — users orient via the whole model first (NN/g: dollhouse
   first delights, then users want guided movement inward).

## Orbit mode (exterior / inspect)

| Input | Action |
|---|---|
| Mouse drag / 1-finger drag | Orbit around focal point |
| Scroll wheel / pinch | Dolly in–out (zoom), clamped 0.5×–8× home distance (shipped) |
| Right-drag / 2-finger pan | Pan the focal point (the "grab and move it around" ask) |
| Double-click / double-tap on model | Fly-to: focal point moves to tapped surface point, dolly in ~40% |
| Home button | Animated return to opening frame (shipped) |

Orbit target stays clamped inside model bounds; auto-glide home if the model leaves the
viewport (shipped — keep).

## Walk mode (interior walkthrough)

Matterport-style for touch, game-style for desktop:

- **Desktop:** WASD + arrow keys to move, mouse-drag to look, scroll = move forward/back,
  Q/E optional turn. Speed ~1.4 m/s walking pace, Shift = 2×.
- **Touch:** a single **virtual joystick bottom-left** (move) + 1-finger drag anywhere else
  (look). This outperforms tap-to-move on splats because there are no Matterport sweep nodes
  to snap to. 2-finger pinch = nothing in walk mode (avoid mode confusion).
- **Eye height locked ~1.6 m above detected floor**; gentle ground-follow so **stairs and
  ramps work automatically** — raycast down against the splat density/collision proxy each
  frame and lerp the camera height. No jump button, no flying in Walk mode.
- **Collision-lite:** soft slowdown near dense splat regions rather than hard walls
  (hard collision on splats feels glitchy; Matterport also uses soft constraints).
- Double-tap floor = glide forward to that point (tap-to-walk augment, works on both inputs).

## Mode switching + chrome

- Keep the shipped 40px cluster: **Home · Orbit/Walk toggle · Fullscreen** (+ ⋯ overflow).
- Entering Walk from Orbit: animate the camera down to eye height at the nearest floor point
  to the current view center (never teleport-cut — motion continuity prevents disorientation).
- Exiting Walk → Orbit: glide back up to a framing that keeps the current room centered.
- First-run hint chips (one-time, glass): Orbit "drag to orbit · pinch to zoom · double-tap
  to inspect"; Walk "joystick to move · drag to look · double-tap floor to walk there".
- UI fades to ~40% after 3s idle, restores on any touch (Matterport convention).

## Why not other patterns

- **Tap-node navigation (Matterport sweeps):** requires capture positions as nav anchors;
  splats are continuous — free walk + tap-to-glide is better suited.
- **Dollhouse-as-navigation:** NN/g found it confusing as a primary nav; keep overview as
  the Orbit mode default instead, not a separate clickable dollhouse.
- **Roll controls (Q/E roll):** never expose roll to end users; horizon stays locked.

## Implementation notes (Spark + R3F)

- One controller component owning both modes; mode = state machine (orbit ⇄ walk) with
  animated transitions; shared raycast helper against splat bounds proxy.
- Floor detection: reuse percentile-trimmed bounds bottom plane as fallback floor; refine
  with local density raycast where available.
- All gestures via pointer events (works mouse + touch uniformly); joystick only renders on
  coarse pointers.
- Ship behind the existing share/auth/embed single code path rule.

## Sources

- Matterport guided tour + Showcase navigation docs (support.matterport.com)
- PlayCanvas SuperSplat camera controls (developer.playcanvas.com)
- NN/g "Virtual Tours: High Interaction Cost, Moderate Usefulness" (nngroup.com)
- antimatter15/splat + LiXin97/gaussian-viewer control mappings (github.com)
