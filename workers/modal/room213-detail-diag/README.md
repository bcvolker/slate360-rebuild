# Room 213 detail diagnostic (2026-09-25) — render-only

Report: `docs/ops/ROOM213_DETAIL_LOSS_DIAGNOSTIC_2026-09-25.md`. Data/crops: `docs/ops/room213-detail-diag-2026-09-25/`.
R2: `experimental/spirula-hardened/detail-diag-2026-09-25/`. Modal app: `slate360-room213-detail-diag` (separate).

Reproduce (dd = a scratch dir holding golden/, edge/ artifacts, src/ fisheye frames + masks, poses):
1. `python state_vs_ply.py <state.tar> <splat.ply> out.json` — saved state vs exported PLY (A vs B, numeric).
2. `python views.py target_poses.json <src> <dd>/refs` — matched pinhole cameras + rectified source references
   (upload refs/ to R2 `…/detail-diag-2026-09-25/refs/`).
3. `python -m modal deploy diag_app.py`; `python launch.py spirula_stages '{"models":["golden","edge"],"stages":["A","B"]}' out.json`
   — stage A (--resume saved state) and B (--init-ply exported PLY, 0 iterations), Spirula eval at the matched cameras.
   Motion: add `"tag":"motion","views_key":"motion/views.json"`.
4. `python spark/server.py <dd> 8766`, open `spark/index.html?file=/d/golden_export.ply&poses=/d/poses_main.json&tag=golden_C`
   (stage C = product settings). Checks: `&lod=0&shfix=1` (SH re-encode), `&blur=0&preblur=0.3`. Decode dump: `&lod=0&decode=1`.
5. `python analyze.py <dd> <out> labels_all.json`; `python spark_decode_check.py …`; `python cpu_raster.py <dd> out.json`;
   `python cpu_packed_attrib.py …`; `python cpu_colour_split.py …`; `python motion.py <dd> out.json`.
