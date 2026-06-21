# Capture & Navigation UX Plan (synthesis of multi-AI audits)

Status: **planning / spec** (no code yet). Consolidates 6+ independent external UX audits — which
**strongly converged**. Enriches `UI_NAV_BRANDING_UNIFICATION.md` + `TWIN_CAPTURE_CAMERA.md`.
Audience: non-technical field workers (electricians, supers) on a jobsite, gloves, bright sun.

## 0. The three blocking problems (unanimous) — fix before store submission
1. **App identity is lost on sub-routes** — the platform bottom nav never changes inside Site Walk /
   Twin 360, so users can't tell which app they're in.
2. **Twin 360 mode ambiguity (photo vs video)** — worst of all, the mode indicator is *replaced by
   the REC timer during recording*, exactly when confirmation matters most.
3. **"Details" is undiscoverable** — after capture, "Details" looks optional; testers end the walk
   without it and don't know the flow continued. **This is the #1 drop-off fix.**

## 1. Navigation contract — one grammar, three depths, accent as an AMBIENT signal
Grammar everywhere: **left = back/up · center = context · right = sync + tokens + profile.** App
identity = **color + name + icon**, never color alone.

| Depth | Header | Bottom | Accent |
|---|---|---|---|
| **Platform** (`/app`,`/projects`,`/slatedrop`,`/coordination`,`/account`) | Slate360 + profile | platform tabs (Home·Projects·SlateDrop·Activity·Account) | neutral graphite |
| **Module** (Site Walk / Twin homes + sub-routes, not capture) | `● Site Walk`/`● Twin 360` badge + title | **module tabs** with **4px accent top border**, accent on active tab | green `#00E699` / blue `#3D8EFF` |
| **Capture/Task** | minimal task header + mode badge | **hidden** — floating rail only | **4px accent bar at the very top edge** (visible in sunlight) |

Rules (field-worker proof):
- **Back (‹) = one level up, always.** Never doubles as "Exit." Aria: "Back to Site Walk."
- **Exit = top-right text, confirmed** (destructive). Different slot from Back.
- **App switcher = long-press the app badge** (or `···`) → sheet: `● Site Walk · ○ Twin 360 · Slate360 Home`. **Never buried in Account.**
- Platform home labeled **"Slate360 Home"**, not "Dashboard."
- The accent color appears on the **active nav tab + header badge + capture top bar** at every depth —
  so context is *glanceable*, never read.

## 2. Capture screen — one grammar both apps, mode UNMISTAKABLE
Signal mode in **three places at once: header badge + segmented toggle + shutter shape.**

**Shutter morphology (resolves cross-app branding — shape differentiates, app keeps ONE color):**
| App · state | Shape | Color | Label |
|---|---|---|---|
| Site Walk · ready | circle ◉ | green | "tap = photo · hold = import" |
| Site Walk · captured | circle (dim) = retake | white | demoted; primary moves to the rail button |
| Twin · VIDEO idle | circle ◉ | **blue** | "TAP TO RECORD" |
| Twin · VIDEO recording | **square ■** | **red** + pulsing top bar | "● REC 0:42 / ~1:30" |
| Twin · PHOTOS idle | **stacked/burst ◉◉ + tick marks** | **blue** | "AUTO · every Ns" |
| Twin · PHOTOS capturing | circle + progress arc | blue | "CAPTURING · 24 frames" (never "REC") |

- **Twin stays blue** in both modes (don't borrow Site Walk's green); **shape + label** carry the
  photo/video difference; **red appears only during video recording** (universal). 
- **Mode badge in the header is PERSISTENT — never replaced by the timer.** Timer sits *next to* it.
- **Recording = a red 4px bar across the top edge** (GoPro pattern) + timer + mode label. Hide the
  mode toggle while recording, but keep the badge.
- Haptic + brief toast on mode switch ("Photo mode — 1 photo every second while walking").

## 3. THE fix: Capture → Add info → Done (step discoverability)
Root cause = hierarchy + wording, not just a label. After every capture:
- **Step strip under the task header:** `● Capture ── ○ Add info ── ○ Done` (accent fill on active).
- **Full-width PRIMARY button** (accent, ≥48px): **"Add info →"** (verb), replacing the tiny "Details"
  arrow. Demote the shutter to a small **"Retake"** text link.
- **Auto-open the details sheet** to ~50% after ~400–800 ms on the first few captures (remembered).
- **"Skip for now"** ghost link below the primary (reduces capture anxiety; makes primary feel primary).
- **Rename in field UI:** "Details" → **"Add info"**; "Save & next stop" → **"Next stop →"** (demote
  "Save & stay"); screen title → "Stop N · Add info."
- **Block silent exit:** if info incomplete, Exit asks "This stop has no notes — add info or discard?"
- **Save feedback:** "Stop saved" toast + green check on the filmstrip thumb (trust).
- **Twin equivalent:** `Scan ── Review ── Submit`; rename the "Done ✓" rail button → **"Review (N clips) →"**;
  Review screen's sole primary = **"Submit for 3D processing"** (with the token estimate).

## 4. Settings & control persistence (the nuance everyone stressed)
- **Capture-rate selector:** kill the blind tap-cycle. Use a **persistent labeled chip** (`📷 1s ▾`)
  that opens a **bottom sheet of labeled presets** with plain-English helpers / walk-speed framing
  ("Normal — 1 photo/sec", "Slow & detailed — 2s"). Sheet auto-closes on Done / 4s idle.
- **HQ camera locks (ISO/shutter/WB/focus):** shown as **locked chips/rows with values + 🔒**; tap to
  override → confirm ("may reduce 3D quality"); a "Camera" summary chip ("Auto (locked) ✓") on the HUD.
- **Persistence rule (critical):** **auto-hide CHROME** (header/rail) after ~3s while walking; tap
  viewfinder to restore. **NEVER auto-hide OPERATIONAL STATUS** — mode badge, capture rate, recording
  timer/frame count, coverage %, and the Stop button stay visible always. **Auto-hide is only for
  one-time coach marks.**
- **During active recording:** settings drawer is **dimmed/locked** ("Stop recording to adjust"); no
  ISO/shutter rows on screen (glove mis-taps).

## 5. Flow fixes & de-jargon (per-app stuck points)
- **One dominant primary action per screen**, verb+object, no jargon nouns.
- Renames: "camera-only" → **"Walk without plan"**; "Create deliverable" → **"Generate report / Share
  with team"**; Twin "PHOTOS" → **"Photos (timed, higher resolution)"**; mode picker gets 1–2 line
  descriptions + an (?) explainer.
- **Coverage ring** (Twin): add **"Coverage 62%"** text + threshold ("Good at 80% · Complete at 95%").
- **End-walk modal:** show **stops with/without notes** + **"Add missing info"** shortcut (Procore pattern).
- **Completion states:** explicit success screen with **exactly two CTAs** ("View in project" / "Start
  new"); show **processing-time estimate** ("ready in ~20 min") + **push notification** when done.
- **Token/credit estimate shown BEFORE capture** starts (no surprise block).
- **Twin review wizard:** collapse 5 steps → **3** (merge sources into clips; quality+confirm).
- **First-run coach marks** once ("Tap the green button to capture"; "Press & hold the plan to pin").

## 6. Branding consistency — my synthesized advice
1. **One chrome kit, token-driven.** Header, bottom nav (platform/module variants), capture rail,
   step strip, settings sheet, mode badge — all from one component set reading Graphite Glass tokens
   + the per-route `--mobile-shell-accent`. Both apps assemble the same parts; only accent + labels
   differ. (No per-app one-off chrome.)
2. **Accent = ambient identity.** Green = Site Walk, Blue = Twin, neutral = platform — always on the
   active tab + header badge + capture top bar. One app = one color; differentiate states by **shape
   and label**, not by borrowing the other app's color.
3. **One capture grammar across both apps** (shutter, step strip, settings sheet, recording bar) so a
   worker who learns one learns both.
4. **Verb-first buttons, no jargon**, one primary per screen, visible step sequence on any multi-step
   flow. This single discipline fixes most first-timer confusion.
5. **Operational status always visible; chrome auto-hides.** That's the line that keeps capture both
   clean and trustworthy.

## 7. Implementation priority (P0 = before App Store)
| P0 (ship first) | P1 | P2 |
|---|---|---|
| Capture→Add-info **step strip + rename + full-width primary + auto-open sheet** (Site Walk) | Module bottom nav with accent border (both apps) | App switcher polish in header |
| Twin **persistent mode badge + red recording bar + square-stop shutter** | Settings bottom sheet (rate presets + HQ lock rows) | Twin review wizard 5→3 |
| **App badge + accent** on every module route (header) | Chrome auto-hide 3s while walking (status stays) | Coverage % + threshold labels |
| De-jargon the key buttons ("Add info", "Walk without plan", "Generate report") | Completion success screens + processing estimate + push | Coach marks |

Maps to existing components the audits named: `SharedCaptureTaskHeader`/`CaptureCanvasTopBar`,
`CaptureCanvasBottomRail`, `useCaptureV2DetailDrawer`/note-review, `TwinCaptureModeSelector`,
`TwinCaptureBottomRail`, `TwinCaptureTopBar`, `MobilePlatformHeader`/bottom-nav, module nav configs.
