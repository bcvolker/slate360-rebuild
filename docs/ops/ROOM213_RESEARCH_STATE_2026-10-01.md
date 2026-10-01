# Room 213 reconstruction research: where things stand (2026-10-01)

**Audience:** any assistant (including the Grok bot) picking up the Room 213 detail work.

**Scope:** this is a research track only. It changed **no** production code, no website and no client portal. Website and Directed Tours work live in other branches and are deliberately **not** on main.

## The question

Can a continuous **Insta360 X4 360° video walkthrough** produce a visibly sharp, stable, photorealistic Gaussian model of a room? The test room is Room 213, an ASU classroom.

## Current answer

**Not yet.** Fine detail is softened during **reconstruction**, not lost in capture or conversion, and no tested fix recovers it.

On the reference target, a table-top corner edge seen from about 0.8 m:

| Stage | Edge width (10–90%) |
|---|---|
| Exact training pixels | **2.12 px** |
| Predicted from multi-view disagreement alone | ≈ 2.6 px |
| Rendered by the Spirula model ("A") | **4.79 px** (×2.3) |

The same pattern holds on an armrest (2.30 → 3.70 px).

## What has been ruled out, in order (each has a report in `docs/ops/`)

1. **Forensic source-to-render audit** — `ROOM213_FORENSIC_DETAIL_AUDIT_2026-09-30.md`.
   - Video detail ends at about 1.5–2 training px; distance is the main lever.
   - Panorama stitching was refuted as the cause of a 5 px offset.
   - The old "60% detail" metric was retired.
2. **.insp still-photo preflight and a capture sheet.** `ROOM213_INSP_PREFLIGHT_2026-09-30.md`, `ROOM213_CAPTURE_SHEET_W_SV_S.md`. A home test is still waiting on photos from Brian.
3. **Stationary vs walking capture.** Equivalent at a 1/320 s shutter (`ROOM213_STATIONARY_VS_WALKING_2026-09-30.md`).
4. **Close passes reach training intact.** `ROOM213_CLOSE_PASS_LINEAGE_2026-09-30.md`.
5. **Displacement vs blur:** it is true reconstruction softening, not misalignment (`ROOM213_CLOSE_DETAIL_LOSS_DIAGNOSTIC_2026-09-30.md`).
6. **More close views (4 → 20) did not help:** table edge 5.01 px (`ROOM213_DENSE_CLOSE_1_RESULT_2026-09-30.md`).
7. **The table Gaussians are not under-ranked for densification** (83rd–96th percentile). The sampler is flat (`ROOM213_DENSIFY_DISCRIMINATOR_2026-09-30.md`).
8. **Product-path memo** — `ROOM213_PRODUCT_PATH_DECISION_2026-09-30.md`.
9. **Spirula v2026.9.30 ROI mode:** invalid as a test. It moved the budget to the ceiling and removed the table, and the new release's own control rendered the edge at 5.75 px (`ROOM213_ROI930_DISCRIMINATOR_2026-09-30.md`).
10. **Spirula configuration reconciliation:** no confound found (`ROOM213_SPIRULA_RECONCILIATION_2026-09-30.md`).
    - Long-axis split was active in A.
    - The table splats sit at a screen size of ≤0.06, against a limit of 0.3, so the developer's suggested 0.1 cannot affect them.
    - Distractor robustness was off.
11. **Postshot (commercial, Windows GUI):** blocked. It needs a Windows NVIDIA machine, a paid licence and a GUI operator, so it doesn't fit the R2 → Modal pipeline (`ROOM213_POSTSHOT_BENCHMARK_PREFLIGHT_2026-09-30.md`).
12. **Cloud-native alternative trainer check:** LichtFeld Studio IGS+ was selected (`ROOM213_CLOUD_NATIVE_TRAINER_CHECK_2026-09-30.md`).
13. **LichtFeld IGS+ benchmark** — one run: `ROOM213_LFS_IGS1_PREFLIGHT_2026-09-30.md`, `ROOM213_LFS_IGS1_RESULT_2026-10-01.md`.
    - All pre-run gates passed: exact pixels, cameras to 1e-11 px, all 5,080 faces loaded at 1718².
    - The 150k-step run **degenerated** into a fog of huge Gaussians.
    - Classification: `LICHTFELD_NO_MATERIAL_IMPROVEMENT`. It is **not** evidence either way about fine detail.

**Spirula developer:** has been contacted. The package is `SPIRULA_DEVELOPER_REPORT_FINE_EDGE_2026-09-30.md`; also see `SPIRULA_DEV_REPRO_PACKAGE_2026-10-01.md`. Do not send further messages without Brian.

## Open decisions (Brian)

- Whether to try anything further on the trainer side. Every option needs explicit approval; there are no automatic follow-up runs.
- Whether Postshot is worth a Windows/NVIDIA machine and a licence.
- Whether to pursue capture-side changes instead: closer passes or still photos.

## Rules this track follows

- Spirula production ("Golden"), the official model and the A+ preview are untouched.
- Changes are additive only. One approved experiment at a time, with a stop rule.
- A gain that shows up only in metrics is not a pass; it must be visibly sharper.
- Modal compute is capped per experiment. Check `modal billing report`, which bills CPU and RAM as well as GPU.

## Where everything lives

**Code and per-experiment artifacts:**
- Branch `feature/spirula-worker-hardening`, under `workers/modal/room213-*` and `docs/ops/room213-*`.
- That branch also carries older Spirula worker code, so it is **not** merged to main.

**Data:**
- Modal volume `slate360-recon-experiments`, under `room213/2026-09-29/`.
- Subfolders: `capture/conditions/{A,Adense,ROI930,LFS_IGS1}`, `forensic/cp1` (frozen evaluation set), `capture/renders/`.

**Frozen evaluation harness:** `workers/modal/room213-forensic/analyze_edges.py` on `forensic/cp1`. It reproduces A at 2.12 → 4.79 px.
