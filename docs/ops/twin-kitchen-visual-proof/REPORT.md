# Kitchen visual proof

Job `79a4f0ac-32e9-4358-bda0-e1a7461510e1`. Preview: `/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`

## 1. Root cause of the shredded GLB screenshot

The TSDF is **not** a shredded reconstruction. Same 15 mm mesh as Route C:

- 3,316,842 triangles, 1,768,725 vertices
- 13,343 components, **89.6%** in the largest
- 0.001% degenerate
- 0.04% inconsistent vertex vs face normals
- 71% inward-facing toward AABB centre
- Vertex colours present (mean RGB ≈ 0.56, 0.51, 0.45)
- Y-up, metres, gravity aligned

Three viewer bugs stacked on a healthy mesh:

1. **Corrupt cloud `geometry.glb` container.** Open3D wrote a 138 MB GLB whose only chunk is JSON with a 103 MB base64 data-URI (`buffers[0].byteLength = 103476204`). ASSIMP refuses it (`Buffer view offset/length out of range`). Three.js can parse it slowly. Display derivative: binary `geometry-web.glb` (68 MB) of the **same** triangles.
2. **Camera above the ceiling.** Dummy station eye Y = 1.6 m; ceiling p98 ≈ 1.24 m; AABB max Y ≈ 1.42 m. Default mode was dollhouse at `[0, 4.6, 4]`, outside the AABB, looking at the exterior hull. That is the cardboard-fin screenshot.
3. **Vertex colours unused.** `GlbBody` kept MeshStandardMaterial without `vertexColors`, plus a hard directional light on 15 mm marching cubes.

Floor from metric QA: Y ≈ **−1.595 m**. Human eye = floor + 1.6 m ≈ **0.005 m**.

## 2. AABB / dimensions (source mesh)

| | X (width) | Y (height) | Z (depth) |
|---|---|---|---|
| min | −2.50 m | −1.82 m | −5.43 m |
| max | 7.05 m | 1.42 m | 3.39 m |
| extent | **9.55 m** | **3.24 m** | **8.82 m** |

Units: metres. Up: +Y (ARKit / Open3D).

## 7. Same-camera switching

Geometry ↔ Hybrid ↔ Geometry keeps the walk pose (one Canvas, layer visibility only). Reality currently fills the frame with the V1 web splat, so the switch is same-pose but not yet a readable kitchen.

## 8. FPS / load

| | |
|---|---|
| GLB download | **1.7–2.0 s** (68,102,688 bytes) |
| Page goto | **14–16 s** (compile + parse) |
| Geometry FPS | **~56** |
| Reality FPS | **~4.2** (fill-rate; V1 web derivative) |
| Memory | not reported by the harness |

## 9. PASS / FAIL

**FAIL** as a full kitchen visual proof.

| Gate | Result |
|---|---|
| Geometry human-eye reads as a kitchen (fridge, cabinets, opening) | **Partial pass** — identifiable, still noisy TSDF |
| Geometry reads as architectural space, not shredded fins | **Fail** — 15 mm isosurface + holes remain |
| Reality V1 recognizable and navigable | **Fail** — brown fill; V1 trainer wrote xyzrgb only (no trained scale/quat/opacity) |
| Hybrid appearance + geometry occupy the same room | **Fail** until Reality is a real splat |
| Dollhouse / plan | Layout readable as kitchen+living; floor still striped |

## 10. Remaining visual deficiencies

- TSDF holes / 15 mm voxel noise on cabinets, ceiling, fridge (do not remesh; display-only if we add a smooth derivative later).
- V1 `x4_gaussian_raw.ply` is **xyzrgb means only**. No checkpoint. Web SPZ is a spacing-derived ellipsoid stand-in, already SIM3'd via `x4_gaussian_in_arkit.ply`. Spark still fill-rates at the human-eye camera.
- Spark compass “N” watermark.
- Worker `geometry.glb` remains the broken data-URI container; preview uses `geometry-web.glb`.

## 11. Branch

See commit. Do not merge `main`.

## 12. Preview URL

http://localhost:3000/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1
