# Twin 360 — what was broken, what we changed, and what it will actually fix

Plain-language companion to `TWIN360_PIPELINE_V2_BUILD_PLAN.md`. Written 2026-07-26.

Starting premise, stated plainly: **the previous pipeline did not reliably produce usable
models.** One capture reached PSNR 28.97 and was declared the visual baseline; the car-interior
test was garbage; "model looks like a blob" was mitigated but never closed; 360 input produced
nonsense; a one-minute video took 25 minutes to import. This document is about why, and whether
the changes address the actual causes.

---

## 1. What the pipeline already did

```
iPhone (ARKit + LiDAR, multi-clip)  ->  upload to R2  ->  Trigger  ->  Modal GPU
    COLMAP works out where the camera was  ->  Splatfacto trains a Gaussian splat
    ->  cleanup (outlier removal, crop, cap)  ->  .spz file  ->  web viewer + share link
```

That skeleton is sound and is **not** being replaced. The capture app, the upload path, the
job/callback plumbing, credits, share tokens, and the cleanup stage all stay.

---

## 2. What was actually wrong

Ordered by how much damage each caused.

**a. The pipeline threw away the phone's own position data.**
ARKit knows where the phone was, in metres, with gravity. The worker discarded that
(`ALIGNMENT_STRATEGY="colmap_first"`), solved from images alone, and then tried to *reverse-
engineer* scale and up-direction afterwards. Both recoveries were fragile: scale silently gave
up with `residual_too_high` on the same capture that had worked minutes earlier, and the
up-direction was guessed from the floor — which is what produced upside-down models.

An earlier attempt at the opposite extreme (trusting ARKit poses outright) scored PSNR 9.5–14.7
versus COLMAP's 23.3, and was correctly abandoned. So the project concluded poses were useless.
**That conclusion was wrong** — the problem was using them as *truth* rather than as *evidence*.

**b. 360 media was mishandled twice over.**
A 360 video was matched by the plain-video branch *before* the 360 check, so it was cut into
flat frames and handed to COLMAP as if shot through a normal lens. Nothing downstream can
recover from that. Separately, Insta360 raw files were rejected outright as "unsupported" —
while the capture guide told users to upload them.

**c. Uploads were unreliable and jobs started early.**
The same 262.9 MB video registered three times; the job then ran on an incomplete set because
the query filtered to "ready" assets and *silently excluded* the ones still uploading rather
than waiting.

**d. Quality settings that already existed were switched off.**
The trainer supports exposure/white-balance compensation and camera-pose refinement. Neither
was enabled. One flag being passed (`cull-alpha-thresh 0.1`) was the default value, so it did
nothing at all despite a comment claiming otherwise.

**e. The output was a dead end for professional use.**
One file type (`.spz`), viewable only in our own viewer. No mesh, no CAD, no floor plan, no
square footage. Edits made in the desktop editor were overlays that never reached a download —
"the downloaded file still has the mess."

---

## 3. What is changing

| Change | Fixes | Evidence it works |
|---|---|---|
| **Pose priors** — ARKit position + gravity enter the solve as weighted *evidence* under a robust loss, so a bad one is down-weighted rather than believed | (a) | Measured: median camera-centre error **3.92 m → 0.06 m** on synthetic weakly-matched sequences |
| **Projection-aware 360** — equirect vs dual-fisheye detected per file; 360 video routed to unwrap before SfM; pitch rings so ceilings/floors are seen | (b) | Detection verified on the real 8192×4096 fixture; ordering bug fixed and asserted |
| **Upload integrity** — content fingerprint makes registration idempotent; jobs refuse to start while anything is still uploading | (c) | Code complete; needs the migration applied to activate |
| **Training flags** — exposure/WB compensation, antialiasing, camera-pose refinement, denser densification, tighter anisotropy | (d) | Ships as an A/B arm; unproven until run on real captures |
| **Deliverables** — vector floor plans with real areas, mesh export, CAD formats, destructive bake | (e) | Floor plans verified: <1% area error residential, multi-room + columns + partitions on a commercial plate |

**Nothing is switched on by default.** Every quality change is an A/B arm; today's behaviour
stays the default until a side-by-side comparison wins.

---

## 4. Will this produce usable models? Honestly:

**What it should fix:** models at wrong scale, upside-down models, run-to-run inconsistency on
the same capture, 360 input producing garbage, jobs processing incomplete uploads, and the
absence of professional outputs. Those are pipeline-caused and the changes target them directly.

**What it will not fix:** bad capture. Roughly 80% of final quality is decided when the shutter
is running — motion blur, exposure drift, insufficient overlap, glass and mirrors, textureless
walls. A blurry walkthrough will still reconstruct badly. That is why the capture SOP exists.

**What is still unproven:** the pose-prior gain is measured on *synthetic* data. It validates
the mechanism, not our captures. Until an arm runs on real benchmark captures and is compared
visually, the honest status is "well-founded expectation," not "proven."

**Where it will help most / least:**

| Scenario | Expectation |
|---|---|
| Interior walkthrough, iPhone + LiDAR | **Best case.** Priors, metric scale, gravity, and LiDAR depth all available |
| Exterior, drone stills | **Strong.** Drone EXIF GPS auto-populates the same prior mechanism — free, no extra work |
| Interior 360 (Insta360) | **Fixed from broken.** Was garbage; now correctly unwrapped. Quality unproven |
| Exterior 360 drone (A1) | **Context only.** Obstacle avoidance forces 5–7 m standoff — no close facade detail |
| Interior + exterior in one model | **Hardest, least solved.** Expect separate blocks aligned at a doorway, not one seamless solve |

---

## 5. Viewing, navigating, editing — what clients actually get

This is a **separate problem from reconstruction quality**, and it is less far along.

**Exists today:** browser viewer via share link (no login), orbit for exteriors and
walk-through for interiors, tap-to-measure, pins and comments, side-by-side progression
compare, and a desktop editor that crops, erases, slices, and repositions.

**Mobile vs desktop:** the *viewer* works on both — mobile renders up to 150k splats, desktop
500k, chosen automatically. The *editor* is desktop-only, and the plan keeps it that way apart
from a simple erase brush; precise editing on a phone is a poor experience.

**Known gaps, in priority order:**
1. **Edits are cosmetic.** Cropping and erasing are non-destructive overlays — the downloaded
   file still contains everything. The "bake" step fixes this.
2. **Only `.spz` downloads**, which no design tool opens. Mesh, `.ply`, `.glb`, and CAD exports
   are planned.
3. **No section cuts or "dollhouse"** — cutting a building open to look inside is designed but
   not built.
4. **The floor plan is invisible.** A plan image is generated for every model today and has
   zero UI surfaces.
5. **No embed.** Putting a twin on a client's own website was described in copy that has since
   been corrected; the route does not exist.

---

## 6. Testing against previous captures

**This is the right test, and the tooling is ready.** Every capture needed already exists —
the best-ever phone walk, the car interior, the iPhone+X4 dual capture, the ASU drone set. No
new fieldwork.

- `scripts/ops/list-twin-benchmarks.mjs` finds and ranks them, nominating a regression guard
  and a hard case.
- `scripts/ops/dispatch-twin-experiment.mjs --train-profile quality` reprocesses one through a
  chosen arm without disturbing the live model.

**What blocks it:** this development session runs in a cloud container with no credentials and
a network policy that refuses Supabase and Modal outright (403 at the gateway). Reprocessing
must run from a session that has backend access. See `docs/ops/WEB_SESSION_BACKEND_ACCESS.md`.

**What "it worked" will look like:** metric scale applied on 100% of runs instead of
intermittently, up-axis measured rather than guessed, equal-or-better PSNR on the good capture,
a visibly better car interior, and a 360 capture that produces something rather than garbage —
confirmed by opening two share links side by side, not by reading numbers.
