# ASU benchmark tools — research / NOT deployable product infra

These ~62 scripts produced the ASU mesh, orthos, and every published measurement in
the DroneDeploy head-to-head (docs/research/DRONEDEPLOY_RECONSTRUCTION_ANALYSIS.md).
They are one-shot research/benchmark tooling: no product code imports them, and the
twin/photogrammetry Modal workers do not depend on them. Committed for
reproducibility of the published numbers only.

`patch_ortho.HISTORICAL.py` is a spent one-shot source patch whose anchor no longer
exists in worker.py (main's ortho() carries a newer hole-fill). It will fail on
`assert old in s` by design — kept for the record, do not run.
