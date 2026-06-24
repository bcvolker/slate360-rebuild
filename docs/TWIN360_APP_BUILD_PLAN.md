# Twin360 Mobile App — UX Build Plan, Layout & Style Guide

_Goal: a mobile-first, App-Store-grade experience that takes a user from a quick room scan
all the way to a stakeholder walking through a branded, interactive 3D twin on their phone —
with SlateDrop as the connective tissue for offloading files from any device or sensor._

---

## 0. Grounding — what already exists (reuse, don't rebuild)

| Capability | Status today | Plan posture |
|---|---|---|
| Native capture (photo/video/LiDAR) | Built (`TwinCaptureFlow`, `TwinCaptureScreen`, ARKit plugin) | **Keep**, refine UI/nav only |
| Multipart upload + pause/resume + quota | Built | Keep |
| Credit cost + balance + buy + time estimate | Built (`TwinCreditGate`, estimate hook) | **Refine** (live updates, clarity) |
| Cloud processing (Trigger→Modal GPU splat) | Built, real, production-grade | Keep |
| SlateDrop subsystem (mobile + desktop browsers, folders, picker) | Built | **Elevate** to a first-class source |
| "Add from SlateDrop" into a twin job | Partially wired (`TwinSubmitStepSources`, `fetchSlateDropFileAsBlob`) | **Formalize + make prominent** |
| Interior walk mode (click-to-move) | Built but **single-floor** (`flyInteriorFromHit`) | **Fix for stairs/multi-level** |
| Orbit viewer, crop (edit-list), camera-path | Built (crop/camera desktop-gated) | **Bring crop + default-view to mobile** |
| Branded share link | Link works; **branding not populated**, edits not applied in share viewer | **Complete branding + apply edits** |
| Twin-ready notification | In-app only | **Add email/SMS share-out** |

Design rule that stays true: **the phone captures, uploads, and views — heavy compute stays in the cloud.**

---

## 1. Design principles (proven, App-Store-aligned)

1. **One primary action per screen.** Every screen has a single, obvious next step (big bottom-anchored CTA within thumb reach). Borrowed from iOS HIG + Linear/Cash App clarity.
2. **Thumb-first layout.** Primary actions live in the bottom 1/3; destructive/secondary actions up top. No critical control in the top corners on phones.
3. **Progressive disclosure.** Show the minimum; reveal advanced controls (quality tier, retain-raw, roles) behind "Advanced" or contextual sheets.
4. **Continuous, legible status.** The user always knows: what stage they're in, what it costs, how long it'll take, and whether their files are safe (SlateDrop).
5. **Reference bar = Matterport / Polycam / Canva-share.** Capture simplicity of Polycam; viewer walkthrough intuitiveness of Matterport; share polish of Canva.
6. **Motion with meaning.** Smooth camera tweens (already present), spring sheet transitions, skeleton loaders — never block on a spinner without context.
7. **Accessibility + App Store quality:** Dynamic Type, 44pt min touch targets, VoiceOver labels, reduced-motion honoring, no text in unsafe areas, graceful offline, no crashes (WebGL fallbacks).

---

## 2. App shell & information architecture

**Bottom tab bar (Twin360 mobile shell) — 4 tabs max:**

```
[ Twins ]   [ + Scan ]   [ SlateDrop ]   [ Account ]
   hub       center FAB     files hub      profile/credits
```

- **Twins** — the hub: your spaces/models, statuses (Processing / Ready / Failed), quick resume.
- **+ Scan** — center, elevated FAB → launches the capture/build flow (quick scan or project).
- **SlateDrop** — files hub: folders, uploads from any device/sensor, the staging ground for sources.
- **Account** — credits balance + "Add credits", plan, settings, notifications.

This keeps SlateDrop one tap away everywhere (your requirement) and makes "start a scan" the unmistakable primary action.

---

## 3. End-to-end flow (the spine)

```
Twins hub
  └─(+ Scan)→ 1. Start choice (Quick scan ▸ / Project scan ▸)
              2. CAPTURE  (refine only)  ──┐
                                           ├──▶ 4. BUILD (sources + credits + time)
              3. SLATEDROP add sources  ──┘        │  (add from device, camera roll,
                                                    │   SlateDrop folders, other devices)
                                                    ▼
                                          5. SUBMIT + PROCESSING (live status)
                                                    ▼
                                          6. READY (notify) → 7. VIEWER + light edits
                                                    ▼
                                          8. SHARE composer (branding + role)
                                                    ▼
                                          9. STAKEHOLDER LINK (orbit + walk, branded)
```

---

## 4. Screen-by-screen spec & layout

> Layout notation: **Top** = header/status zone, **Body** = scroll/canvas, **Bottom** = thumb action zone.

### Screen 1 — Twins Hub (`app/(mobile)/digital-twin`)
- **Top:** "Twins" title, org switcher (if multi), credits pill (tap → Account).
- **Body:** vertical card list of spaces. Each card = thumbnail/floorplan poster, name, status chip (Processing %, Ready, Failed), last updated. Empty state = friendly illustration + "Scan your first space."
- **Bottom:** nothing competing — the center **+ Scan** FAB owns the action.
- **Refinements:** status chips drive re-entry; Processing cards show live % (already have `useTwinJobRealtime`); Ready cards have a quick "Share" shortcut.

### Screen 2 — Start Choice
- Two large tap targets: **Quick Scan** (no project, fastest) and **Scan into a Project** (binds to a project + its SlateDrop folder). Subtext explains the difference. One-tap "Quick Scan" is the default-weighted choice.

### Screen 3 — Capture (REFINE ONLY — keep the engine)
Keep current capture mechanics; improve UI/nav:
- **Top:** thin status bar — mode (Video/Photo), LiDAR chip (live point count), frame-cap chip, GPS-lock dot. Collapse to icons to maximize viewfinder.
- **Body (viewfinder):** full-bleed camera. Add a **coverage ring/heatmap** ("you've covered ~60% of the room") to teach good capture — the #1 driver of twin quality. Ghost-frame overlap guide already exists; make it more legible.
- **Bottom:** big capture button center; mode toggle left; "Done → Review" right. After capture, a filmstrip of clips with thumbnails.
- **Micro-coaching:** first-run overlay — "Walk slowly, overlap your shots, keep moving around objects." Dismissible, remembered.
- **Exit safety:** "Your clips are saved to SlateDrop" reassurance (already messaged) so leaving never feels lossy.

### Screen 4 — Build / Add Sources (REIMAGINED — this is the heart of your ask)
This unifies capture output + SlateDrop + other-device files into one job, with live cost/time.

- **Top:** "Build your twin" + space name. A persistent **estimate bar** (sticky): `~N credits · ~M min · Balance: X`. Updates live as sources change (fix the estimate hook to recompute on source-set change, not just captureId).
- **Body — Sources list (grouped):**
  - **This capture** — clips/photos/LiDAR just captured.
  - **Add from SlateDrop** ▸ — opens the SlateDrop picker (folders from other devices/sensors: drone, 360 camera, terrestrial LiDAR, etc.). Prominent, because this is how multi-device aggregation happens. Show folder → multiselect files → they appear as sources with `origin: "slatedrop"`.
  - **Add from this device** — camera roll, files.
  - **Add 360 / drone / scan** — typed sources (auto-tag where possible; manual fallback).
  - Each source row: thumbnail, type icon, size, remove. A small "from iPhone / from SlateDrop / drone" provenance tag.
- **Quality tier:** segmented control (Standard / High) with live delta on cost + time ("High = +35% credits, +1.8× time"). Default Standard.
- **Bottom:** primary CTA **"Review & Submit"**. If balance < cost, CTA becomes **"Add credits to continue"** (see billing UX in §6/your link-out plan).

**Why this matters:** your "offload from other devices into folders, then submit" workflow becomes: dump everything into a SlateDrop folder from any device → here, tap "Add from SlateDrop" → select the folder's files → submit. No re-uploading, no cables.

### Screen 5 — Submit + Processing
- **Top:** space name + "Building your twin."
- **Body:** a vertical **stepper with live status** (Uploading → Queued → Reconstructing → Finishing) driven by `useTwinJobRealtime` progress_pct. Honest time-remaining. Reassurance: "You can close the app — we'll notify you."
- **Bottom:** "Notify me" (push/email toggle) + "Back to Twins." Failure state = clear cause + "Try again" + "Contact support," never a dead end.

### Screen 6 — Ready / Notification
- Push + email + in-app: "Your twin of [Space] is ready." Tapping deep-links to the viewer.
- First-open celebration (subtle), then straight into the viewer.

### Screen 7 — Twin Viewer + light edits (bring crop + default-view to mobile)
- **Body (canvas):** the splat. Default to **Orbit**; a clear **mode switch: Orbit ⇄ Walk** (segmented, top-center).
- **Bottom control cluster (thumb zone):** Recenter, Measure, Comment/Pin, **Edit**, **Share**.
- **Edit (light, mobile-safe):**
  - **Crop** — draggable 3D box gizmo (writes the existing SDF box edit-list op; near-zero compute).
  - **Set default view** — frame it, tap → saves one camera keyframe as the opening shot for viewers + share.
  - **Erase** (optional) — tap a spot to remove a stray blob (SDF sphere op).
  - Keep slice/accordion/progression/2D-plan/cinematic authoring **desktop-only** (correct call).
- **Crucial fix:** make the **share + authenticated viewers apply `edit_list` and the saved camera** (today only the desktop editor does), so crops/default-view actually reach recipients.

### Screen 8 — Share composer (branded link)
- **Top:** "Share [Space]."
- **Body:**
  - **Branding preview** — your logo + brand color on a mini viewer card (pull from `org_branding`; populate the unused `branding_snapshot`). "This is what stakeholders see."
  - **Access:** segmented role — View / Comment / Download. Optional expiry + password.
  - **Default view:** confirm the saved opening angle.
- **Bottom:** **"Create link"** → then a native share sheet: **Copy link, Text (SMS), Email**, plus QR. One tap to text/email a stakeholder.

---

## 5. The stakeholder interactive viewer (the external branded link) — make it unmissably intuitive

This is the payoff screen. A non-technical stakeholder opens a text/email link on their phone and must instantly "get it." Model the proven Matterport mental model: **three modes + teleport.**

### 5.1 Layout
- **Full-bleed canvas.** Branded top bar: logo (left), space name (center), "Shared by [Company]" subtitle. Minimal chrome — auto-hide on interaction.
- **Bottom mode switch (thumb zone):** **Explore (Orbit)** ⇄ **Walk** ⇄ **Dollhouse** (optional). Big, labeled, with icons.
- **First-load coachmarks:** "Drag to look · Tap the floor to move · Pinch to zoom." Auto-dismiss after first interaction. Honor reduced-motion.

### 5.2 Walk-through that handles stairs & obstacles (the real engineering)
Current `flyInteriorFromHit` teleports to an eye-height point but pins to one global floor (`bounds.min.y`) — fine for a single room, **broken for stairs/levels.** Plan:

1. **Local-floor teleport.** Instead of global `bounds.min.y`, derive the destination's floor from the **hit point's local elevation** (raycast down from the tapped point, or use the tapped surface Y minus eye offset). Each tap then lands at the correct height → **stairs and split levels just work** because the user clicks where they want to stand.
2. **Navigable waypoints (optional, premium):** during processing, auto-place "stand here" nav nodes on detected floor regions (use the worker's floor-Y + a coarse occupancy grid → the same data that makes the 2D floorplan). Stakeholders tap glowing waypoints to hop room-to-room and up stairs without precise aiming. This is the Matterport feel.
3. **Obstacles:** teleport-to-surface inherently avoids walls (you can only land on visible floor). Add a gentle "can't go there" nudge if a tap lands on a vertical/!floor surface.
4. **Smooth transit:** keep the existing 950ms eased tween between points so movement feels like gliding, not jumping. Add subtle head-bob-free easing for comfort (avoid motion sickness; respect reduced-motion).
5. **Controls:** drag = look, tap floor = move, pinch = zoom/FOV (already wired), optional on-screen joystick for continuous walk on tablets. Double-tap = return to default view.

### 5.3 Trust & polish for stakeholders
- **Branded, fast first paint:** show the branded floorplan/poster instantly while the splat streams (doubles as the crash fallback). Logo + brand color throughout.
- **Guided tour (optional):** if the owner saved a cinematic path on desktop, offer a "Play tour" button — autopilots through the space, then drops into free-walk.
- **Zero friction:** no login, works on iOS Safari + Android Chrome + desktop, responsive (already strong: safe-area, keyboard-aware, fullscreen). Comment/measure only if the role allows.

---

## 6. Design system & App-Store-grade polish

- **Tokens:** use the existing `--s360-*` Graphite Glass + restrained amber/teal system; no new hardcoded palettes. Define twin-specific surface tokens for the canvas chrome.
- **Components to standardize:** `EstimateBar`, `SourceRow`, `StatusStepper`, `ModeSwitch`, `BrandedTopBar`, `BottomActionCluster`, `Coachmark`. Build once, reuse across Twin360 + Site Walk.
- **Performance (the App Store stability bar):**
  - WebGL **context-loss handler** + restore.
  - **Poster fallback** on every viewer (reuse `DemoTwinViewer` pattern) — also the branded first paint.
  - **Model size / device-memory guard**; auto-lower the mobile splat budget (already 80k) on weak devices.
  - **Audit `backdrop-blur`** in viewer chrome (known iOS jank) — reduce to one layer.
- **Motion:** spring sheets, skeletons, eased camera tweens, no unexplained spinners.
- **Accessibility:** Dynamic Type, VoiceOver labels on all controls, 44pt targets, reduced-motion paths, color-contrast AA.

### Billing UX (ties to the Apple-commission strategy)
- In-app, when balance < cost: a calm **"You need N more credits"** card with a **"Get credits"** button. On the **US storefront**, this opens the **system browser** (not the in-app webview) to a logged-in web purchase page with saved payment → pick a pack → return → balance refreshes (no Apple commission, per the May 2025 US rules). Outside the US, gate to Apple IAP or hide. Keep credits **account-based** (consumed across web/desktop/mobile) — the strongest compliance posture.

---

## 7. Phased build plan

**Phase 0 — Foundations & stability (unblock everything) — ~1 wk**
- WebGL context-loss handler, poster fallback, memory/size guard, backdrop-blur audit.
- Apply `edit_list` + saved camera in the **share + authenticated** viewers (prereq for crop/default-view to reach anyone).
- Populate `branding_snapshot` on share create (copy thermal pattern).

**Phase 1 — Build/Add-Sources screen + SlateDrop elevation — ~1.5 wk**
- Reimagined Build screen with sticky live **EstimateBar** (fix estimate to recompute on source change).
- Formalize **"Add from SlateDrop"** as a primary, folder-first picker; provenance tags; multiselect.
- SlateDrop as a bottom-tab in the Twin360 shell.

**Phase 2 — Capture refinement — ~1 wk**
- Coverage ring/heatmap, first-run coaching, cleaner top/bottom chrome, filmstrip polish. (No engine changes.)

**Phase 3 — Mobile light edits — ~1.5 wk**
- Touch crop box gizmo; "Set default view"; optional erase. Rides on Phase 0.

**Phase 4 — Share composer + branded link — ~1 wk**
- Branding preview, role/expiry, native share sheet (SMS/email/QR).
- Email/push "twin ready" + share-out.

**Phase 5 — Stakeholder walkthrough — ~2 wk**
- Local-floor teleport (stairs/levels); coachmarks; branded fast-paint; optional waypoints + "Play tour."

**Phase 6 — Billing link-out (US) + region gating — ~1 wk (parallel)**
- System-browser purchase, account-credit refresh, `getPlatform`/storefront gating.

_Sequence rationale: Phase 0 is the multiplier — it makes edits/branding actually visible and the app crash-safe. Everything else layers cleanly on top._

---

## 8. Device strategy & risks

- **Graceful degradation, not allowlists.** Old phones can view with reduced splat budget + poster fallback; authoring (crop/walk) appears only when the device renders smoothly (runtime perf check).
- **Stated baseline:** smooth viewing/editing ≈ iPhone 12 / recent iPad+; **LiDAR scanning requires Pro models**. Communicate in store copy + in-app, but never hard-crash on supported-but-older devices (Guideline 2.1).
- **Multi-level twins** are the main viewer risk — solved by local-floor teleport; test on a two-story capture early.
- **Memory on stakeholder phones** — poster-first + size guard is the safety net.

---

## Appendix A — Prompt for external AI review

> Paste the following into another AI platform (with this doc and, if possible, the repo structure) to get a second-opinion critique.

```
You are a senior product designer + mobile architect reviewing the UX build plan for
"Twin360," a mobile-first iOS/Android (Capacitor + Next.js) app for creating and sharing
3D digital twins (Gaussian splats) of physical spaces (construction/real-estate/field).

CONTEXT:
- Pipeline: user does a quick room scan (phone camera video/photo + iPhone-Pro LiDAR) →
  optionally adds files from other devices/sensors (drone, 360 camera, terrestrial LiDAR)
  via "SlateDrop," a cloud file-folder feature every user has → sees a live credit cost +
  time estimate + remaining balance, can buy more credits → submits → cloud GPU reconstructs
  a .spz splat → user gets notified → opens a viewer to do LIGHT edits (crop, set default
  camera view) → shares a BRANDED, interactive link (logo + brand color) via text/email →
  a non-technical STAKEHOLDER opens it on any device and must intuitively orbit AND
  walk through the space, including up stairs and around obstacles.
- Heavy compute is cloud-only; the phone captures, uploads, and renders finished models.
- Advanced authoring (cinematic fly-throughs, accordion/book slicing, progression across
  time, 2D-plan generation) is intentionally desktop-only. Mobile gets capture, view,
  crop, set-default-view, measure, comment, and share.
- Renderer: @sparkjsdev/spark with an 80k-splat mobile budget + LOD. Known risks: WebGL
  context loss in iOS WKWebView, memory on low-end phones, backdrop-blur jank.
- Existing interior "walk" mode teleports to an eye-height point but pins to a single
  global floor (breaks on stairs); plan is local-floor teleport + optional nav waypoints.
- Billing: to avoid Apple's commission, US storefront links out to a web purchase
  (system browser, saved payment, account-based credits); per May 2025 US App Store rules.

REVIEW TASKS:
1. Critique the screen-by-screen flow (Hub → Start → Capture → Build/Add-Sources →
   Submit/Processing → Ready → Viewer+Edit → Share → Stakeholder Viewer). Where will real
   users get confused, drop off, or feel friction? Propose concrete fixes.
2. Stress-test the "add files from other devices via SlateDrop folders, then submit"
   workflow. Is it discoverable and fast? Better patterns?
3. Evaluate the stakeholder walkthrough UX for a NON-technical user on a phone, especially
   multi-level navigation (stairs) and obstacle avoidance with a splat (no collision mesh).
   Compare to Matterport/Polycam. What makes it intuitive vs. frustrating?
4. Assess mobile performance & crash-safety strategy for old devices. What else is needed
   to pass Apple's stability bar and feel "perfect"?
5. Critique the live credit-cost + time-estimate + buy-more flow and the US link-out
   billing pattern. UX and compliance risks?
6. Flag anything that violates iOS HIG, App Store Review Guidelines, or accessibility.
7. Give a prioritized list of the top 10 improvements, each with effort (S/M/L) and impact.

Be specific and opinionated. Cite proven patterns. Assume we will implement your best ideas.
```

---

## Appendix B — Open product decisions (need your call)
1. **Billing:** US link-out (save commission, more friction) vs. Apple IAP (frictionless, ~15–30% fee) vs. both? Drives Phase 6.
2. **Waypoints:** auto-generated nav nodes (premium feel, more worker output) vs. free-walk only for v1?
3. **Mobile edit scope:** crop + default-view only, or also erase/single-slice on tablets?
4. **Recommended-device messaging:** how aggressive in store copy vs. silent graceful degradation?
