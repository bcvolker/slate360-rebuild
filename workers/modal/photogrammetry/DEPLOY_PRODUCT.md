# Exterior photogrammetry product worker

Deploy from this directory:

```powershell
$env:PYTHONIOENCODING = "utf-8"
python -m modal deploy product_worker.py
```

Copy the `reconstruct-exterior` endpoint into:

```text
MODAL_PHOTOGRAMMETRY_ENDPOINT
```

The worker uses the existing `slate360-twin-worker` Modal secret for R2 access,
callback signing, and dispatch authentication. Trigger task
`twin.photogrammetry_mesh` sends ready `drone_photo`/`photo` assets to it.

The first contract emits:

- textured GLB: the primary client-viewable model;
- JPEG orthomosaic and local DEM artifact;
- JSON QC report with registration, reprojection, coverage inputs, and derivative keys.

The initial georeference status is deliberately `UNREGISTERED`. Do not advertise
survey-grade coordinates until CRS/GCP/checkpoint processing is added and gated.
