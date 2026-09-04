# Local artifact publish contract

Desktop workstation processes. This laptop/repo **publishes** approved files. No Modal. No Trigger. No retraining.

## `artifact_manifest.json`

```json
{
  "version": 1,
  "projectKey": "AOB205",
  "visitDate": "2026-08-17",
  "title": "AOB205 — August 17 visit",
  "building": "AOB205",
  "floor": "Level 1",
  "artifacts": [],
  "planControls": [
    { "pathX": 0, "pathY": 0, "planU": 0.12, "planV": 0.80 },
    { "pathX": 8.4, "pathY": 0.2, "planU": 0.71, "planV": 0.78 },
    { "pathX": 8.1, "pathY": 6.0, "planU": 0.69, "planV": 0.22 }
  ]
}
```

`planControls` are 2–3 known camera/path positions plus the matching plan UV. The publisher solves an approximate similarity. Visual navigation only.

## Artifact fields desktop must provide

| `id` | `kind` | `role` | Notes |
|---|---|---|---|
| `wt-proxy` | `walkthrough_proxy` | `client` | H264 ERP, ~2:1, horizon-locked. Required before public Play. |
| `wt-poster` | `walkthrough_poster` | `client` | JPEG poster from the proxy. |
| `wt-master` | `walkthrough_master` | `lineage` | Optional source MP4/INSV. Never served to clients. |
| `gs-source` | `gaussian_source` | `lineage` | PLY / training folder. Keep for registration. |
| `gs-web` | `gaussian_web` | `client` | Browser SPZ/PLY. Publish only if `qaStatus: accepted`. |
| `gs-poses` | `gaussian_poses` | `internal` | Camera poses JSON. |
| `gs-sparse` | `gaussian_sparse` | `internal` | Sparse reconstruction (COLMAP/openMVG). |
| `gs-transform` | `gaussian_transform` | `internal` | `T_model_to_project` JSON (column-major 4×4 + scale). |
| `gs-preview` | `gaussian_preview` | `client` | Optional still. |
| `gs-qa` | `gaussian_qa` | `internal` | QA JSON. Never shown in the client portal. |
| `mesh` / `cloud` / `pick` | `geometry_*` | `internal` or `client` | Mesh / cloud / picking proxy. |
| `st-NNN` | `station_erp` | `client` | One 2:1 JPEG per station. **`stationId` required.** |
| `plan` | `plan_pdf` | `client` | Floor-plan PDF. |
| `doc-*` | `document` | `client` | Other project PDFs. |

Every artifact: `path` (local file), `role` (`client` \| `internal` \| `lineage`), optional `contentType`, optional `qaStatus` (`accepted` \| `rejected` \| `candidate`).

Rejected Gaussians are stored as lineage only. Candidates are not client-visible.

## Publish command

```
node scripts/ops/generate-aob205-manifest.mjs [local-AOB205-folder]
npx tsx scripts/ops/publish-local-artifacts.mjs --manifest path/to/artifact_manifest.json
```

Idempotent on `projectKey` + `visitDate`. Uploads `client` artifacts only. Lineage files stay on disk unless `--include-lineage`. Does not invoke ingest, COLMAP, Modal, or Trigger.
