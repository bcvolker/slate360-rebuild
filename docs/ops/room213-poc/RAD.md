# Room 213 POC — paged RAD experiment (2026-09-27): TESTED BUT REJECTED

**Question.** Can Spark's paged RAD format (progressive, smaller) replace the corrected float PLY for cellular
delivery without losing the fidelity recovered by the verified render profile?

## Build

- Tool: Spark `build-lod` at tag **v2.1.0** (commit `f22236f9`), the same version as the viewer.
- Patch: force F16 for alpha, rgb, scales (ln), orientation and SH1–3, instead of the default "Auto" quantisation
  (8-bit colour clipped at the 1st–99th percentile, 8-bit SH clipped at the 5th–95th percentile).
- Command: `--rad-chunked --force-f16 --max-sh=3 --quality`.
- Environment: Modal CPU (no GPU), about 2.5 min, under $0.05.
- Input: the presentation main PLY (957,418 splats).
- Output: 1,334,785 nodes (957,418 finest leaves plus LoD interior nodes), 21 chunks, **147.2 MB** (62% of the
  237.4 MB PLY). All 22 files sha-verified.
- Stored under the private prefix `…/models/presentation-v1-rad/room213-pres-v1-f16-chunked/`.
- F32 was not built: v2.1.0 stores rgb, SH, opacity, scale and rotation in f16 internally, so F16 is the ceiling.

## Viewer test

A local-only experiment path (`?probe=1&asset=rad`, never honoured on Vercel) uses the same crop, pins, navigation
and live profile check as the PLY path. The only differences are `paged: true`, LoD on, `pagedExtSplats`, and
`lodSplatCount` 1.5M. The profile check passed: accumExtSplats true, blur 0, preBlur 0.

## Results: identical cameras, viewport, DPR and profile, compared with the presentation PLY

| View | PSNR vs PLY | Detail (Laplacian) RAD/PLY |
|---|---|---|
| Dollhouse hero | 18.3 dB | 0.93 |
| Plan (orthographic) | 17.9 dB | **0.12** |
| Walk — windows | 13.2 dB | 0.95 |
| Walk — door/whiteboard | 16.8 dB | 1.02 |
| Walk — window end | 17.4 dB | 0.98 |
| Walk — front wall | 14.3 dB | 1.01 |
| Walk — low corner | 16.3 dB | 0.76 |

Visual findings (screenshots in the session scratchpad `poc/radcmp_*.png`):

1. **Plan collapses to coarse blobs.** Spark's LoD traversal sizes nodes for a perspective camera. The orthographic
   Plan camera sits 40 units up and is served the coarsest levels.
2. **Dollhouse and Walk are visibly brighter and washed out, and softer on the whiteboard and edges.** Merged interior
   LoD nodes change appearance even at F16 precision.
3. Only ~485k of the 957k leaves were active at the Walk test pose within the 1.5M budget.

## Decision

The quality loss is large and visible, and Plan breaks outright. **The corrected float PLY stays canonical** for the
POC. It is delivered from `media.slate360.ai` with immutable CDN caching: 237 MB in ~4–5 s on a fast connection,
~68 s on a 30 Mbps LTE-like link, with the poster shown in under 1 s.

A future attempt would need all of the following:

- LoD pinned to leaves while the camera is still, or an orthographic-aware LoD metric for Plan;
- a per-view A/B against this table;
- the same brightness/detail gate.

This should wait for a Spark version whose LoD merge preserves appearance.
