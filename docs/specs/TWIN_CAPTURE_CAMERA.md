# Spec: Twin 360 Capture — Mode Clarity + Quality Lock (camera controls)

Status: **planning / spec**. Twin capture screen (`/digital-twin/capture` → `TwinCaptureFlow`).
Two asks: (1) make photo-vs-video mode unmistakable; (2) lock camera settings (white balance,
exposure, ISO, focus) for best 3D-reconstruction quality — automatic by default, visible, each
toggleable off.

## 1. Why lock camera settings (the rationale)
Photogrammetry / Gaussian-splat reconstruction wants **consistent images** across the walk. Auto
camera behavior fights that:
- **Auto-exposure** → brightness changes frame-to-frame → seams, floaters, color banding in the twin.
- **Auto white balance** → color temperature shifts → inconsistent splat color.
- **Autofocus** → focal length/focus drift → breaks the fixed-intrinsics assumption the solver relies on.
- **ISO** drift → varying noise.
**Locking exposure + white balance + focus + ISO to fixed values for the whole walk → markedly
better, more consistent twins.** So lock-by-default is the right call for a quality capture.

## 2. Feasibility — the key constraint (honest)
| Platform | What's possible |
|---|---|
| **Android Chrome (PWA)** | Decent: `MediaStreamTrack.getCapabilities()/applyConstraints()` exposes `exposureMode`, `whiteBalanceMode`, `focusMode` (`manual`/`continuous`), and sometimes `exposureTime`, `colorTemperature`, `iso`, `focusDistance`. Can lock what the device reports. |
| **iOS Safari / PWA** | Poor: Safari exposes almost **none** of these advanced constraints. Locking is largely unavailable in the browser. |
| **Capacitor native (store build)** | Full control via a **native camera plugin** — iOS AVFoundation (`AVCaptureDevice.lockForConfiguration`, `exposureMode/whiteBalanceMode/focusMode = .locked`, set ISO/exposureDuration) and Android Camera2. This is the **only reliable path to true manual lock on iOS.** |

**Recommendation:** two-track. (a) **PWA now:** best-effort — read `getCapabilities()`, lock the
subset the device supports, gray out the rest. (b) **Store build (Twin 360 ships as Capacitor):**
build a **native camera module** for full lock on both platforms — this is where "highest quality"
truly lands. Design the UI once; it drives whichever backend is available.

## 3. Mode clarity (photo vs video) — make it unmistakable
- **Segmented toggle, top-center:** `[ 📷 PHOTO | 🎥 VIDEO ]` — active segment filled in Twin accent
  (`#3D8EFF`), inactive dimmed. Big, obvious.
- **Shutter changes per mode:** photo = solid circle; video = red dot that becomes a recording ring
  + timer.
- **Persistent status badge** near the shutter: `PHOTO · 1 every 2s` or `VIDEO · ● REC 00:14`.
- **Recording state is loud:** a red border/REC pill + elapsed time while recording video; none in photo.
- Haptic + brief label flash on switch. (Today the mode is ambiguous — these remove all doubt.)

## 4. Quality Lock UI (photo mode) — automatic, visible, toggleable
When in **photo mode**, show a **Quality Lock** row of labeled pills (the exact pattern the CEO
asked for — controlled by default, visible, each tappable off):
```
Quality Lock ●     [Exposure 🔒] [White balance 🔒] [Focus 🔒] [ISO 🔒]   (?)
```
- **Default: all locked** (🔒, accent) — applied automatically when the walk starts.
- **Tap a pill → toggles that lock off** → pill shows "Auto" (dimmed). User sees exactly what's
  being controlled and can disable any single one.
- **(?)** explains: *"Locking exposure, color, and focus keeps every photo consistent for the best
  3D result. Tap any to let the camera adjust it automatically."*
- **Unsupported on this device** → pill grayed + tooltip ("Not available on this device/browser").
- **Lock reference:** on walk start (or a "Lock now" tap), point at a representative, well-lit area
  → capture current auto values → lock to them → walk. A **"Re-lock"** button if lighting changes a
  lot (e.g., indoor→outdoor).
- **Capture rate** control stays (already exists) — sits in the same controls row.

## 5. Where it lives (screen layout)
```
┌───────────────────────────────────────┐
│ ✕ Exit        [ 📷 PHOTO | 🎥 VIDEO ]   ⚙ │  mode toggle + settings
│                                       │
│            [ CAMERA FEED ]            │
│                                       │
│ Quality Lock ●  [Exp🔒][WB🔒][Focus🔒][ISO🔒]│  (photo mode only)
│ PHOTO · 1 every 2s        ( ◉ )       │  status + shutter
└───────────────────────────────────────┘
```
- **Settings sheet (⚙):** capture rate, resolution/quality, the lock toggles (mirror of the pills),
  "Re-lock exposure," and an advanced note.
- **Capture-time metadata:** record which locks were active + their values (exposureTime, colorTemp,
  ISO, focusDistance) into the capture record → the worker/QA knows the capture was consistent and
  can flag walks where locks were off.

## 6. Build notes / sequence
1. **Mode toggle + status + shutter states** (pure UI, works everywhere) — biggest immediate clarity win.
2. **Quality Lock UI** (pills + toggles + settings sheet) — UI + state; wire to a `CameraController`
   abstraction.
3. **PWA backend:** `getCapabilities()`/`applyConstraints()` lock for supported settings (Android);
   graceful "unavailable" on iOS browser.
4. **Native backend (Capacitor plugin):** AVFoundation/Camera2 manual lock for the store build —
   same UI, full control on iOS + Android. (Heavy work stays the cloud pipeline; this is just camera
   config on-device.)
5. Persist lock state + values in capture metadata.

## 7. Open questions
- Default capture quality/resolution for twins (balance detail vs upload size/tokens).
- Whether to auto-re-lock when the device detects a big exposure change, vs manual "Re-lock" only.
- iOS-browser fallback copy (set expectation that full lock needs the installed app).
