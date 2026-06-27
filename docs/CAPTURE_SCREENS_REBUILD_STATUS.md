# Capture Screens Rebuild — Status & Source of Truth

_Last updated: 2026-06-27. Owner: Brian (CEO, non-coder — Claude commits/pushes)._

This is the authoritative status for the **Twin 360 + Site Walk capture-screen rebuild**
effort. It records what is DONE, what is IN PROGRESS, and what is OUTSTANDING, plus the
full feature inventory both screens must preserve. A new chat should read this first, then
the handoff prompt at the bottom.

---

## The end-to-end goal (unchanged)

A user opens a custom capture screen → scans → uploads → the cloud builds a 3D
Gaussian-splat model → the user receives it and shares it via a branded interactive link.

Two capture surfaces, one design ecosystem ("Graphite Glass"):
- **Twin 360** — accent **blue** (`--twin360-blue` `#3D8EFF`). **Native** SwiftUI-over-ARKit
  (LiDAR). The only native capture screen.
- **Site Walk** — accent **green/teal** (`--graphite-primary` `#00E699`). **Web** React
  (`getUserMedia`), hosted remotely and shown in the Capacitor shell.

Shared canvas `#0B0F15`, muted `#A3AED0`, body `#F8FAFC`. Glass = `color-mix` of canvas
(64–72%) + `backdrop-blur` + hairline border. Tokens live at `:root` in `app/globals.css`.

---

## ✅ DONE (shipped to the branch, pipeline proven)

**The capture→upload→process→deliver pipeline works end-to-end.**
- First real model produced: space `281b1ebb` (job `a255b8b6` COMPLETED).
- Native LiDAR capture (`TwinARKitCaptureViewController`) → native direct-to-R2 upload
  (`TwinUploader`) → Trigger `twin.gaussian_splat` → Modal `slate360-twin-gaussian-splat`
  (endpoint `reconstruct`, `MODAL_TWIN_ENDPOINT`) → Supabase callback → share viewer.

**Submit / completion screen** (`components/digital-twin/TwinCaptureSubmitScreen.tsx`,
route `app/digital-twin/(shell)/capture/submit/page.tsx`):
- Post-capture "Scan ready" checkout: hero, Scan again / Add sources, quality segmented
  (Draft/Standard/High), cost + ETA, collapsible assets, surrounding-context chips ("Soon"),
  sticky "Process into 3D model · N credits" dock.
- Realtime phases via `useTwinJobRealtime`: **processing** (stage stepper) → **complete**
  (View 3D twin → `/digital-twin/twins/[spaceId]` + `TwinShareActions` share mint) →
  **failed** (Try again). Colors on graphite tokens.

**Native capture hardening** (`TwinARKitCaptureViewController.swift`, `TwinUploader.swift`,
`LiDARCapturePlugin.swift`):
- **Save-hang fixed**: AR-session interruption could wedge `AVAssetWriter` so
  `finishWriting` never fired → "Saving…" forever. Fixed with a `didExport` idempotent gate
  + 12s watchdog `DispatchWorkItem` + `writer.status == .writing` branch + faster `writePLY`.
- **Upload visibility**: byte-weighted progress (`uploadedBytes/totalBytes`) emitted via
  `uploadPhase` event (`phase`, `label`, `progress`); UI shows "Uploading … 45%"
  (`TwinNativeCaptureLauncher`, `src/plugins/LiDARCapture.ts`).
- **Self-healing workspace**: uploader creates a quick-scan space if none supplied; the
  spaceId guard was removed from the plugin. On success navigates to
  `/digital-twin/capture/submit?captureId=…` (fixed a regression that went to home).
- **Field safety guardrails**: `maxDurationSec` 480→240; record preflight needs ~1.5GB free
  + battery ≥15% (or charging); runtime auto-finish on `.critical` thermal / <750MB disk /
  <10% battery, warns at `.serious` / <25%; video bitrate 12→8 Mbps (H.264).
- **Georef metadata**: keyframe GPS now carries hAcc/vAcc/course; heading capture added
  (CLHeading true/magnetic/accuracy).
- **HUD restyled to Graphite Glass blue** (teal→`#3D8EFF`): glass top bar (Back / state /
  timer), metrics bar, 72pt shutter, torch + finish tool buttons. _NOTE: this is a restyle,
  not the full designed HUD — see OUTSTANDING._

**Browser mockups** (so design is reviewable without TestFlight):
- `/preview/twin-capture-hud` — single HUD design target (blue).
- `/preview/twin-screens` — side-by-side: Twin Capture (blue, full-featured) · Site Walk
  Capture (green, reference) · Twin Scan-ready (blue). Self-contained tokens, `· v3` marker.

---

## 🔄 IN PROGRESS / what we're trying to do now

**Rebuild BOTH capture screens, unified and superior**, while preserving every existing
feature and meeting each screen's distinct needs (colors, native vs web). The current plan:
1. Gather cross-AI design feedback (in flight — Brian collecting from other platforms).
2. Synthesize + evaluate it into ONE plan, discuss decisions with Brian, then build in slices.
3. Deploy to `main` so Brian can review in TestFlight with everything still wired.

**Cross-AI consensus so far** (to fold into the plan):
- Native HUD = SwiftUI overlay (`UIHostingController`) over UIKit `ARView`/`ARSCNView`.
  **Never** a WebView over ARKit (caused WebContent crashes).
- One shared design-token source (`tokens.json` → CSS + Swift via Style Dictionary).
- Minimal, instrument-like HUD; build the browser mockup first, approve, then port 1:1.

**Specific UX problems to solve in the rebuild:**
- Reimagine the **invisible long-press "pin/attach file to a photo"** control as a **visible
  button / HUD affordance** to embed a file anywhere on a captured photo (both apps).
- Clean **Video ⇄ Photo toggle** + photo **interval** (0.5 / 1 / 2 s) on Twin.
- **Exposure lock** available in either mode (auto-lock or manual lock-off toggle). The ONLY
  reason camera controls exist is to lock exposure — keep it that simple.

---

## ⛔ OUTSTANDING / blockers

- **Vercel production deploy appears stuck.** Valid commits land on `main` but a fresh
  browser served old code (persisted across hard refresh + different browser → a deploy
  issue, not cache). An earlier broken import (`IconFlashlight` from `@tabler/icons-react`,
  which does not exist — now switched to `lucide-react`) likely failed `next build` and
  froze production on an old deploy. **Must be unblocked by Brian/Composer** (inspect Vercel
  build logs, redeploy, supply the branch PREVIEW URL) before rebuilt screens are reviewable.
- **Native HUD is a restyle, not the full designed feature set.** Missing on native:
  Video/Photo modes, photo interval, AE-lock toggle, multi-clip chips, torch bottom-left
  placement. Slated for the SwiftUI rebuild.
- **LiDAR bypass is non-deterministic** — one re-run (`150b17d2`) failed in COLMAP/bypass.
  Make the Modal worker deterministic.
- Lower priority: fast parallel upload rework; multi-clip merge; 360-video (DJI/Insta360)
  worker support; iOS IAP migration for credits (Guideline 3.1.1 — Stripe non-compliant on iOS).

---

## Full feature inventory (must NOT regress in any rebuild)

**Twin 360 capture** (designed React components, mirror in SwiftUI):
- `TwinCaptureScreen` + `TwinCaptureModeSelector` (Video / Photos; `PhotoIntervalSec` 0.5|1|2)
- `TwinCaptureClipChips` (multi-clip), `TwinQualityLockRow` (exposure/WB/focus/iso locks →
  simplify to a single **AE Lock** toggle), `TwinCaptureLidarChip`, `TwinCaptureFrameCapChip`,
  `TwinCaptureGuide`, `TwinCaptureBottomRail` (torch / shutter / Done),
  `useTwinCaptureDeviceSensors` (gyro steadiness).

**Site Walk capture** (`capture-v2` — restyle UI only, **remove nothing**):
- `CaptureCanvasTopBar` (Back pill, title, filmstrip toggle),
  `CaptureCanvasBottomRail` (torch, shutter "Next photo", details, end),
  `CaptureModeToggle` (plan / camera), pins via long-press (→ reimagine as a visible control).

---

## Key files

- Native: `ios/App/App/Plugins/LiDARCapture/{TwinARKitCaptureViewController,TwinUploader,LiDARCapturePlugin}.swift`,
  `src/plugins/LiDARCapture.ts`.
- Twin web: `components/digital-twin/{TwinCaptureSubmitScreen,TwinNativeCaptureLauncher}.tsx`,
  `app/digital-twin/(shell)/capture/submit/page.tsx`, `components/digital-twin/TwinCaptureScreen.tsx` + siblings.
- Site Walk: `components/capture-v2/*`.
- Mockups: `app/preview/{twin-capture-hud,twin-screens}/page.tsx`.
- Worker/orchestrator: `workers/modal/twin-gaussian-splat/worker.py`, `src/trigger/twin-*.ts`.

---

## Constraints (verbatim, do not break)

- Develop on branch `claude/digital-twin-process-review-a0qeq8`; never push elsewhere without
  explicit permission. Commit trailers end with the required `Co-Authored-By` + `Claude-Session`.
- Never put the model identifier in commits/PRs/code/artifacts.
- Heavy compute stays cloud/desktop, never on the app. Thermal Studio is CEO-only/private/quiet.
- **Site Walk redesign must not remove features/functions/layout — restyle UI components only.**
- This cloud sandbox has NO Modal/Trigger/Supabase/Vercel credentials and NO production network
  access (cannot deploy, run SQL, or run a clean build). GitHub MCP is scoped to
  `bcvolker/slate360-rebuild` only.

---

## HANDOFF PROMPT — paste into a new chat

> I'm building **new and improved capture screens for both Slate360 apps** (Site Walk and
> Twin 360) that are **superior to what exists today while meeting every feature and function
> of each**. Read `docs/CAPTURE_SCREENS_REBUILD_STATUS.md` first — it is the source of truth
> for what's done, in progress, and outstanding, plus the full feature inventory both screens
> must preserve and the Graphite Glass tokens/colors (Twin = blue `#3D8EFF`, Site Walk = green
> `#00E699`).
>
> I have **a lot of feedback from other AI platforms** on how to rebuild both screens in a
> unified way (I'll paste it in). **Your job, in order:**
> 1. **Synthesize and evaluate** all that feedback against this repo and the existing designed
>    components — figure out the single best plan. Call out conflicts and your recommendation.
> 2. **Have a discussion with me** and walk me through the key decisions before building
>    (modes/interval, exposure-lock toggle, the reimagined visible "pin/embed-file" control,
>    shared chrome vs per-app accents, native SwiftUI-over-ARKit vs web React).
> 3. Once we agree, **rebuild both capture screens in a new, unified way** in reviewable
>    **slices**, preserving all features. Site Walk must lose nothing — restyle only. Twin's
>    native HUD becomes a SwiftUI overlay (never a WebView over ARKit).
> 4. Deploy to **`main`** so I can **test it in TestFlight** with everything still wired
>    (capture → upload → cloud reconstruction → share).
>
> Hard requirements: reimagine the invisible long-press "pin/attach a file to a photo" as a
> **visible button/HUD control** (both apps); Twin must **toggle Video ⇄ Photo** and **lock
> exposure in either mode**. **Note the open blocker:** the Vercel production deploy is stuck
> (see the doc) — rebuilt screens won't be visible until that's fixed; please help confirm/clear
> it (or flag to me) early. Don't start coding the rebuild until we've discussed and decided.
