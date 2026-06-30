# User-Journey Audit (2026-06-30) — what works, what's broken

Four parallel code-trace audits. Status key: ✅ works · ⚠️ partial · ❌ broken/missing.
Most fixes are WEB (deploy via Vercel, live on app reopen — the app loads slate360.ai); native-only
items are marked [TestFlight].

## A. Walks-with-plans journey
1. ✅ **Project create → SlateDrop folders** (`app/api/projects/create/route.ts:106`, entitlement-aware).
2. ✅ **Upload plans (PDF) → tiling** (`lib/site-walk/plan-upload.ts`; server rasterization → realtime sheets).
3. ❌ **Choose existing-pins vs FRESH set** — the Clean/Additive + plan/sheet picker (`PlanPickerSheet.tsx`)
   is BUILT but stranded in `/preview/walk-start`; the live flow (`CaptureV2Orchestrator.tsx:154`) jumps
   straight into the canvas, auto-selects the first ready plan, and always shows prior pins. **No chooser.**
4. ⚠️ **Long-press → capture OR upload** — works (photo / camera-roll / **upload file** invoice·proposal·doc /
   360-from-folder / 360-from-file, `lib/capture-v2/source-picker-rows.ts`). Gap: **note/voice not direct** on
   the pin sheet — only reachable after entering the photo screen.
5. ⚠️ **Return → move pin → 2nd pin → page sheets** — return ✅, repeat long-press ✅, multi-sheet paging ✅.
   ❌ **No pin MOVE** — markers aren't `draggable` (`PlanViewerLeaflet.tsx:267`); a mis-dropped pin must be
   deleted + redropped.
6. ❌ **Interactive stakeholder link with clickable pins on the drawing** — BIGGEST GAP. The share viewer
   (`app/view/[token]/ViewerClient.tsx`) is a flat slideshow; `ViewerItem` (`lib/site-walk/viewer-types.ts`)
   has **no plan-sheet ref / no x,y coords** — the plan-pin spatial context is LOST at deliverable time.
   360 items are individually navigable, but recipients never see pins positioned on the plan image.
7. ✅ **Deliverable persists + editable + in SlateDrop Deliverables folder**
   (`register-deliverable.ts`, `slatedrop-bridge.ts`) — caveat: saved data is the flat item list (per #6).

## B. Twin 360 pipeline — FULLY WIRED end-to-end ✅
Capture (native ARKit+LiDAR / web RGB) → multipart upload → `POST /api/digital-twin/jobs` →
Trigger `twin.gaussian_splat` (reads `MODAL_TWIN_ENDPOINT`) → Modal `reconstruct` worker (COLMAP / LiDAR
bypass → splatfacto → `.spz`+manifest to R2) → signed callback (`lib/twin/job-callback.ts`: creates model,
sets `published_model_id`, credits, **registers into SlateDrop Models + Deliverables**) → branded token-gated
share viewer (orbit + interior walk, pins/measure/comments). **With the just-applied endpoint fix it should
run end-to-end.** Desktop editor exists (`DesktopSplatEditor`, `CinematicCameraPath`).
- ⚠️ **Scene-type gap:** no exterior/interior/both concept on the model/manifest → viewer ALWAYS defaults to
  orbit. Interior-only scans open as a hollow shell; exterior-only offers a pointless interior toggle.
- ⚠️ Reconstruction needs ≥3 images; sparse handheld COLMAP can fail (quality risk, not wiring).
- ⚠️ Only `.spz` splats get the full interior/exterior viewer; glb/pano fall back to a simpler viewer.

## C. Capture-screen consistency + LiDAR-optional
- Same design FAMILY but built as TWO hardcoded copies (accent hardcoded green/blue, not `--app-accent`;
  two layout-token modules; 72% vs 85% glass). Unify into ONE accent-driven `CaptureChrome` keyed by
  `data-app` — matches the shipped dashboard grammar; capture never got migrated.
- ✅ **LiDAR-optional FIXED (59e7d273):** the LiDAR chip is now positive-only — non-LiDAR phones show NO
  "VIDEO ONLY"/"DEPTH NOT ACTIVE" badge (cleared amber + rounded-full too).
- ⚠️ [TestFlight] native "Auto (LiDAR)" exposure pill (`TwinCaptureHudView.swift:256`) renders
  unconditionally — gate on `capability.depthPresent` or relabel.

## D. Backend completeness — (review in progress; folded in on completion)

## Prioritized fixes (next build passes — all web unless noted)
1. **Wire `PlanPickerSheet`** into the live walk (clean vs additive + plan/sheet choice) — built, just unwired. High impact.
2. **Plan-pin interactive deliverable** — extend `ViewerItem` with `planSheetId`+`xPct`/`yPct`, persist pin coords, add plan-map mode to `ViewerClient`. Biggest experience win; larger.
3. **Pin drag/move** — `draggable` markers + persist `dragend`.
4. **Twin scene-type** (exterior/interior/both) → drive viewer initial camera + toggle visibility.
5. **note/voice rows** on the long-press source sheet.
6. **Unify capture chrome** into one accent-driven component; [TestFlight] native exposure-pill gate.
7. **Storage purge** — R2 blobs orphaned by the org wipe; wire a cleanup pass.
