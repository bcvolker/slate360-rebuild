# Spec: Ghost Mode — Indoor Re-localization (Prompt C)

Status: **spec / planning** (no app code). Extends existing plan-pin capture +
`CaptureCanvasGhostPanel`. Heavy matching is **cloud-only** (Modal). Phased so V1 ships without
cloud dependency.

## 1. Technique comparison
| Technique | Accuracy | Effort | Device/Cloud |
|---|---|---|---|
| Plan pin (tap location on PDF) | ±0.5–3 m | Low (mostly built) | Device |
| Compass heading + device orientation | low–med (magnetic drift) | Low | Device hint only |
| EXIF + gravity alignment | improves overlay | Low | Device |
| Visual Place Recognition (embeddings) | high (texture-rich) | High | **Cloud (Modal)** |
| Feature matching (SuperPoint/LightGlue) | sub-meter | Very high | Cloud (defer) |
| Splat anchor (pick point in twin) | high (if twin exists) | Medium | Device view / cloud build |

## 2. Phased approach
- **Phase 1 (ship):** plan-pin + heading. Ghost = prior photo at same `plan_page_id` + pin (±2%)
  OR GPS ≤15 m, filtered by heading (±15°). Manual opacity + nudge. Outdoors uses GPS.
- **Phase 2:** EXIF + gravity to rotate ghost as pitch changes (no cloud cost).
- **Phase 3 (cloud):** "Auto-align" button → Modal extracts an embedding (DINOv2/NetVLAD),
  nearest-neighbor within the **same plan cell** → suggests top-3 ghosts. **Token-metered.**
- **Phase 4:** splat/twin anchor — pick a point in the twin → store world XYZ + camera quaternion →
  ghost re-entry in walk mode.

## 3. Capture-time metadata (store always — enables later phases)
```ts
{ plan_id, plan_page, pin_norm_x, pin_norm_y, plan_scale,
  gps?:{lat,lng,accuracy_m,altitude}, compass_heading_deg, device_orientation:{alpha,beta,gamma},
  camera_facing, focal_length_35mm?, fov, image_w, image_h,
  prior_item_id?, ghost_transform?:{scale,rotation_deg,offset_x,offset_y}, captured_at }
```

## 4. UX
Ghost picker (bottom drawer): Same pin · Nearby GPS · Same room · Similar direction · All project.
Overlay: opacity slider (default 0.45), nudge/scale/rotate, before/live toggle. Heading compass
hint widget. "Auto-align" (cloud VPR) shown only when online, with a token estimate.

## 5. Build order
1. Phase 1 plan-pin + heading ghost (finish what exists) + capture metadata bundle.
2. Phase 2 gravity/EXIF overlay alignment.
3. Phase 3 cloud VPR job (Modal) + plan-cell pre-filter + token gate.
4. Phase 4 splat anchor (after twin viewer work).
