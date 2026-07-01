# Twin 360 capture HUD → match Site Walk capture layout (panel prompt, 2026-06-30)

**Why this doc:** After several sessions, only the top header of the Twin capture screen was made to match Site
Walk. Root cause finally pinned down: **Twin 360 capture is a native SwiftUI HUD**
(`ios/App/App/Plugins/LiDARCapture/TwinCaptureHudView.swift`) rendered over an ARKit `ARSCNView`, while **Site
Walk capture is web/React** (`components/capture-v2/**`). They can't share code — the Swift HUD must *replicate
the Site Walk layout grammar*. Every past web-side fix never touched the native HUD (and native ships only via
Codemagic TestFlight, not Vercel — see [[slate360-twin-capture-stale-build]]).

## Current native HUD structure (the problem)
`ZStack` → `VStack(spacing: 0)`: `TwinHudTopBar` → `TwinHudClipChips?` → `TwinHudChipRow` (LiDAR·pts +
tracking) → `Spacer(minLength: 0)` → `TwinHudQualityPill` ("Auto (LiDAR)") → `TwinHudModeSelector`
(VIDEO/PHOTOS) → `TwinHudHint` ("Ready · tap record") → `TwinHudBottomRail` (record/Done). Accent strip at
physical top (blue idle / red recording).

**User-visible problems (iPhone 15 Pro):** (1) quality pill + VIDEO/PHOTOS toggle + "Ready · tap record" float
in the **lower-middle, obstructing the camera** (the `Spacer` lets the bottom cluster drift up); (2) record/Done
button **nearly invisible** (poor contrast, no solid backing); (3) doesn't match Site Walk's spacing/weight/clear-center.

## Target = Site Walk capture grammar
`components/capture-v2/CaptureCanvasShell.tsx`: vertical flex — compact **top bar**, **full unobstructed center
viewfinder** (flex-1), edge-docked **bottom rail** with a **large high-contrast primary shutter**, right-edge
tool rail, bottom filmstrip. Controls dock to edges; center stays clear.

## Legitimate Twin-vs-SiteWalk differences to KEEP (same layout, different content)
Blue accent `#3D8EFF` (not green); multi-clip **video** record/stop + clip counter + recording timer (not photo
shutter); LiDAR point-count + tracking-state chips; no plan overlay; PHOTOS mode disabled (VIDEO only — toggle
may not need to be on-screen).

## The panel prompt (verbatim — sent to 10+ platforms)
See the session chat log for the full prompt. Summary of the 6 asks:
1. Revised SwiftUI view hierarchy achieving clear-center + edge-docked controls (what to move to bottom rail,
   what to top cluster, what to remove).
2. Make record/Done prominent + always legible over live camera (size, scrim, blue→red state, safe-area anchor).
3. Where the "Ready · tap record" affordance lives without floating over the scene (in the rail / on the button).
4. Dock or collapse the quality pill + LiDAR/tracking chips to the top cluster (never mid-screen).
5. Concrete `.frame`/`Spacer`/alignment/padding to pin bottom cluster to the bottom safe-area edge and top
   cluster to the top, nothing in between (kill the mid-screen drift from `Spacer(minLength: 0)`).
6. Before/after ASCII wireframe.

**Constraints:** SwiftUI over ARKit `ARSCNView`; fixed tokens (blue `#3D8EFF`, no amber/gold, no full-round,
8–12px radii, monospace labels); respect Dynamic Island safe area; camera visible behind chrome. Deliver the
view hierarchy + specific SwiftUI modifiers → implement directly in `TwinCaptureHudView.swift` + cut TestFlight.

## Implementation note
When the panel answers land, edit `TwinCaptureHudView.swift` (and possibly `TwinHudBottomRail`, `TwinHudHint`,
`TwinHudModeSelector`, `TwinHudQualityPill`, `TwinHudChipRow`) to the returned hierarchy, then **cut a Codemagic
TestFlight build** — web deploys do NOT update the native HUD.
