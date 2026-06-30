# Twin 360 Capture HUD — Spec (single source both renderers implement)

**Status: LOCKED spec (multi-AI panel, Jun 29 2026).** The capture HUD is rendered two ways —
**React** (web / non-LiDAR iPhone / Android, over `getUserMedia`) and **native SwiftUI** (LiDAR
iPhone, over ARKit). Both implement THIS spec so they don't drift. Behavioral/state contract lives
in code: [`lib/digital-twin/twin-capture-hud-contract.ts`](../../lib/digital-twin/twin-capture-hud-contract.ts)
(`TwinHudState` / `TwinHudCapability` / `TwinHudActions` / `TWIN_HUD_LABELS`). Layout/pixel values:
[`twin-capture-chrome-layout.ts`](../../lib/digital-twin/twin-capture-chrome-layout.ts)
(`TWIN_CAPTURE_CHROME`). Accent: Twin blue `--twin360-blue` `#3D8EFF`. Canvas `#0B0F15`.

## Decision (panel consensus)
- **NOW — Option 1: native SwiftUI HUD parity, driven by this shared spec.** Keeps the ARKit +
  AVAssetWriter + LiDAR pipeline 100% native (perf/thermal); the HUD is just two renderers of one
  contract. Native change → Codemagic TestFlight rebuild.
- **NOT Option 2** (transparent WKWebView over ARKit): feasible in a demo, but every careful analysis
  flags thermal cliff (~adds 0.5–1 W to an already-hot ARKit+encode load), bridge shutter latency,
  touch routing, and weak production precedent. Rejected for a capture-critical tool.
- **LATER — Option 3: embedded native AR preview view in the Capacitor layout + ONE React HUD on
  top** (not full-screen modal, not transparent overlay). The true "kill the fork" end-state; bigger
  refactor (split `TwinARKitCaptureViewController` into a render-only layer + engine). Revisit after
  parity ships.

## Regions (from `TWIN_CAPTURE_CHROME`)
- **Top bar** (`topBarHeightPx 44`, inset 12, radius 12): Back · scope/status title · clip-chips
  toggle · **Maximize (chrome hide)** · Done · **Home**. *(Native is missing Maximize + Home today.)*
- **Top accent bar**: 4px `--twin360-blue` persistent identity; becomes an 8px pulsing
  `--destructive` bar while video-recording (GoPro pattern).
- **Mode selector** (`modeSelectorBottomPx 167`, row 36): segmented **Photos / Video** + a
  Photos-mode interval control (`photoInterval`, cycled by `onCycleInterval`). **FORWARD-LOOKING on
  the ARKit path:** the native engine is **video-only today** (no Photos capture from `ARFrame` yet),
  so the native HUD should render Photos **disabled** until the engine supports it — do NOT wire a dead
  toggle. The React/getUserMedia path supports both modes now.
- **Quality-lock / exposure row** (`qualityLockBottomPx 209`, row 32): exposure / color / focus pills.
  **Disabled "Auto (LiDAR)" on the ARKit path** (`capability.exposureLock=false`).
- **Bottom rail**: 3-slot — **labeled torch "Light"** (left, `lightButtonSizePx 48`), ring **shutter**
  (`shutterSizePx 72`, center), **Done** (`doneButtonSizePx 56`, right). *(Native already has torch in a
  left-of-shutter slot but labels it **"Torch"** and renders it as a 52px circle — rename to "Light"
  and align to the 48px rail-slot grammar.)* The shutter is **gated on `streamReady && !needsResume`.*
- **LiDAR chip** (additive, `lidarChipTopGapPx 8`): "LiDAR · N pts" + tracking pill — shown only when
  `capability.lidarChip` (depth present). Hidden on RGB-only.
- **Ghost overlay**: prior clip's last sharp keyframe @ ~45% opacity. **Coverage guide**: ring +
  level. **Tip label**: single rotating hint.

## Component → renderer map
| Spec component | React | Native SwiftUI (to build) |
|---|---|---|
| Top bar | `TwinCaptureTopBar` | `TwinChromeTopBar` (+ Maximize + Home) |
| Mode toggle | `TwinCaptureModeSelector` | `TwinChromeModeSegment` (`Picker .segmented`) |
| Exposure/quality | `TwinQualityLockRow` | `TwinChromeQualityPills` (disabled when `!exposureLock`) |
| Bottom rail (torch/shutter/done) | `TwinCaptureBottomRail` | `TwinChromeBottomRail` (labeled torch left) |
| Timer | in mode chip / header | `TwinChromeTimer` (monospaced, tabular) |
| Ghost | `TwinCaptureClipGhost` | `TwinChromeGhostOverlay` (UIImageView) |
| Coverage guide | `TwinCaptureGuide` | `TwinChromeCoverageGuide` |
| LiDAR chip | `TwinCaptureLidarChip` | `TwinChromeLidarChip` (additive) |

## Platform caveats (panel)
- **Exposure lock:** ARKit owns the `AVCaptureDevice`; `lockForConfiguration` for exposure can break
  VIO tracking. On LiDAR, render the pill **disabled** (`exposureLock=false`, label "Auto (LiDAR)"),
  best-effort only. On web/getUserMedia it's fully supported (`exposureLock=true`).
- **Torch DOES work** on ARKit via the wide-camera device (already implemented in the native VC).
- **Thermal governor** stays native and authoritative regardless of HUD; `thermal` drives warn/roll.
- **Bridge rule:** HUD taps may bridge JS→native for *discrete* actions, but capture timing/segments
  are stamped by the **native clock**, never the bridge.

## Anti-drift mechanics
1. **Contract in code** (`twin-capture-hud-contract.ts`): both renderers conform to `TwinHudState`/
   `TwinHudActions`. Add a field → both must handle it.
2. **Token/layout codegen (follow-up):** export `TWIN_CAPTURE_CHROME` + Twin tokens → a
   `twin-capture-chrome.json` consumed by React and decoded by a Swift `TwinCaptureChrome` struct, so
   sizes/colors live in one place (Style-Dictionary-style build step).
3. **Visual-regression gate:** snapshot the React HUD (`/preview/twin-capture-hud`) and the SwiftUI HUD
   (Xcode snapshot/`UIHostingController`) in canonical states (idle, recording, thermal-serious,
   tracking-limited, ghost-on, RGB-only) and assert each matches its own spec baseline.

## Build order
1. ✅ Contract (`twin-capture-hud-contract.ts`) + this spec + decision (done).
2. Reconcile `app/preview/twin-capture-hud/page.tsx` to this spec (labeled torch rail, mode toggle,
   disabled exposure pill) so it's a faithful SwiftUI target. *(web, verifiable)*
3. Build the SwiftUI HUD (`TwinChrome*`) from this spec; wire to the existing engine
   (`TwinARKitCaptureViewController`) via direct targets (no bridge for capture). *(native → Codemagic)*
4. Make the React `TwinCaptureScreen` conform to the contract (compile-time parity).
5. Token codegen + visual-regression gate.
6. (Later) Option 3 embedded-preview refactor.

See [[slate360-twin-native-capture-architecture]], docs/design/TWIN_CAPTURE_HUD_PARITY.md,
[[slate360-unified-capture-design]].
