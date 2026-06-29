# Twin 360 Capture HUD — Parity Gap + Architecture Decision (Jun 29 2026)

**Status: INVESTIGATION LOCKED — architecture decision pending (multi-AI panel).** Triggered by
Brian's TestFlight report: the Twin 360 capture screen is "pretty bare," the flashlight is in the
wrong spot, the header doesn't match Site Walk, and settings/photo-video/timer/exposure are missing.

## The reframing discovery (this changes the whole problem)
There are **TWO different Twin capture screens**, and on a **LiDAR iPhone (Brian's device)** the app
shows the **bare one**. `TwinCaptureFlow.tsx:276-307` hard-branches on LiDAR capability:
- **LiDAR iPhone** → `TwinNativeCaptureLauncher` → hands the whole screen to a **native Swift ARKit
  view controller** (`ios/App/App/Plugins/LiDARCapture/TwinARKitCaptureViewController.swift`,
  `setupHUD()` :191-342). React shows only a spinner.
- **Non-LiDAR / web** → the **rich React `TwinCaptureScreen.tsx`** (header, labeled torch rail, mode
  toggle, REC timer, exposure/quality-lock pills, ghost, guide, LiDAR chip) — already near Site Walk
  parity, arguably richer.

**Therefore: the bare screen Brian sees is NATIVE Swift code. Web-only edits will NOT change it.**
The fix is a native Swift change → **Codemagic/TestFlight rebuild**.

## Why each symptom happens (native HUD)
- **"Flashlight in the wrong spot":** native torch is a free-floating 44pt button left-of-shutter
  (`torchButton.centerYAnchor == recordButton.centerYAnchor`), not in a structured labeled bottom rail
  like Site Walk (`CaptureCanvasBottomRail` left slot with a "Light" chip). The approved preview
  (`app/preview/twin-capture-hud`) ALSO disagrees — it puts torch **top-right** by the timer. Three
  sources of truth disagree on torch placement.
- **"Header doesn't match":** native top bar is `‹ BACK · TWIN 360·LIDAR pill · timer`. Site Walk is
  `Back · title · filmstrip · Maximize(chrome-toggle) · End · Home`. Native lacks the chrome-toggle +
  Home and uses a different right-side composition.
- **"Settings/photo-video/timer/exposure missing":** the native HUD is a single-mode video recorder —
  no mode toggle, no exposure/quality-lock, no settings. The **React** Twin screen HAS all of these;
  the native one never got them.

## Gap table (native HUD = what Brian sees)
| HUD element | Site Walk V2 | Twin **web** (rich) | Twin **native** (Brian) | Needed (native) |
|---|---|---|---|---|
| Header | Back·title·filmstrip·Maximize·End·Home | Back·title·clips·Maximize·Done·Home | Back·pill·timer | + Maximize + Home; match composition |
| Torch | bottom rail left, "Light" label | bottom rail left, labeled | floating left-of-shutter | move to labeled left rail slot |
| Photo/video toggle | n/a (photo tool) | yes | **no** | add mode toggle |
| Timer | none | yes | yes (top) | align styling |
| Exposure / quality-lock | none | yes (pills) | **no** | add exposure pills (`AVCaptureDevice.lockForConfiguration`) |
| Coverage guide / level | n/a | yes | tip label only | add guide |
| Tracking-good / LiDAR chip | n/a | yes | pts pill only | add tracking chip |

## LiDAR-vs-non-LiDAR adaptivity — the deeper issue
Locked intent (memory `slate360-twin-native-capture-architecture`): **SAME UX on non-LiDAR iPhones +
Android; depth layered when available; RGB-only fallback.** Today the app does the OPPOSITE — it
hard-forks to a *worse, separate* UI for LiDAR devices. Detection (`isNativeTwinCaptureAvailable`,
`src/plugins/LiDARCapture.ts`) should pick the *capture engine*, not swap the whole HUD. The HUD
should be ONE design; LiDAR pts / tracking chips render only when present (the React screen already
degrades gracefully — `TwinCaptureLidarChip available={...}`).

## Architecture decision (P0 — needs multi-AI validation before building Swift)
1. **Bring the native Swift HUD to parity** — edit `TwinARKitCaptureViewController.swift` setupHUD/
   constraints to add the labeled torch rail, mode toggle, exposure pills, Maximize+Home, tracking
   chip. Smaller blast radius; keeps native ARKit performance; but HUD stays forked (must keep Swift +
   React in sync forever) and is hand-coded UIKit.
2. **Transparent WebView HUD over the ARKit camera layer** — render the existing React
   `TwinCaptureScreen` chrome over the native ARKit render layer, so Twin has ONE HUD across LiDAR /
   non-LiDAR / Android and the fork dies permanently. Larger native-bridge work; needs the ARKit view
   to expose its camera/controls to JS events.

**Recommendation (pending panel):** lean toward **option 2 (unified WebView HUD)** because it
satisfies the locked "same UX everywhere" intent and ends the three-way fork — but validate feasibility
(ARKit-under-WebView compositing, control latency) with the multi-AI panel first. If option 2 proves
infeasible/slow, fall back to option 1 (native parity) and keep the React + Swift HUDs in lockstep via
a shared spec.

## Done this loop (safe, web-only)
- Gated the leftover LiDAR debug probe (raw `hdr=…/avail=…` strings) behind the `debug` flag in
  `TwinCaptureScreen.tsx` so it never shows to end users (was always-on instrumentation).

## Next (after the decision)
- Reconcile `app/preview/twin-capture-hud/page.tsx` to the agreed parity HUD (single 1:1 SwiftUI/React
  target), then implement — Swift (option 1) or WebView overlay (option 2) — then Codemagic rebuild.

See [[slate360-twin-native-capture-architecture]], [[slate360-lidar-native-capture-plan]],
[[slate360-unified-capture-design]], docs/design/LIDAR_NATIVE_CAPTURE_BUILD_PLAN.md.
