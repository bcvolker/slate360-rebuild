# Slate360 Digital Twin — Modal GPU Worker Deploy

Production Gaussian-splat worker for the Digital Twin pipeline. Trigger.dev dispatches jobs; Modal runs COLMAP + Splatfacto + SPZ export; the worker signs callbacks back to Slate360.

## Prerequisites

- Python 3.11+
- [Modal account](https://modal.com)
- Cloudflare R2 bucket + API token (S3-compatible)
- Same `GPU_WORKER_SECRET_KEY` value configured in Vercel/Trigger.dev and Modal

## 1. Install Modal CLI

```bash
pip install modal
```

## 2. Authenticate

Create a Modal token (browser flow):

```bash
modal token new
```

Verify:

```bash
modal profile current
```

## 3. Create Modal secret

One secret holds R2, callback URL, and HMAC key. Values must match production app env.

```bash
modal secret create slate360-twin-worker \
  R2_ACCESS_KEY_ID="<cloudflare-r2-access-key-id>" \
  R2_SECRET_ACCESS_KEY="<cloudflare-r2-secret-access-key>" \
  R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" \
  R2_BUCKET="slate360-storage" \
  GPU_WORKER_SECRET_KEY="<same-as-vercel-trigger-gpu_worker_secret_key>" \
  SITE_URL="https://www.slate360.ai"
```

Optional (instead of `R2_ENDPOINT`):

```bash
  CLOUDFLARE_ACCOUNT_ID="<account-id>"
  R2_REGION="auto"
```

Update an existing secret:

```bash
modal secret create slate360-twin-worker --force \
  R2_ACCESS_KEY_ID="..." \
  ...
```

## 4. Deploy

From this directory:

```bash
cd workers/modal/twin-gaussian-splat
chmod +x deploy.sh
./deploy.sh
```

Or directly:

```bash
modal deploy worker.py
```

First deploy builds the GPU image (COLMAP, FFmpeg, PyTorch, Nerfstudio, Node). Expect several minutes.

## 5. Read back `MODAL_TWIN_ENDPOINT`

After deploy:

```bash
modal app list
modal app show slate360-twin-gaussian-splat
```

Copy the **reconstruct** web endpoint URL, for example:

```text
https://your-workspace--slate360-twin-gaussian-splat-reconstruct.modal.run
```

Set in Trigger.dev / Vercel:

```bash
MODAL_TWIN_ENDPOINT="https://your-workspace--slate360-twin-gaussian-splat-reconstruct.modal.run"
```

Trigger posts the dispatch JSON to this URL (no extra path). The worker responds immediately with `HTTP 200` and header `x-modal-run-id`.

## 6. Smoke test (optional)

```bash
curl -sS -D - -X POST "$MODAL_TWIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"00000000-0000-4000-8000-000000000001","orgId":"00000000-0000-4000-8000-000000000002","spaceId":"00000000-0000-4000-8000-000000000003","captureId":"00000000-0000-4000-8000-000000000004","sourceKeys":["orgs/test/digital-twin/test/test/photo.jpg"],"is360Flags":[false],"quality":"standard","speed":"standard","modelType":"gaussian_splat","newAssetIds":["00000000-0000-4000-8000-000000000005"]}'
```

Expect `200` and `x-modal-run-id: ...`. The async GPU job will fail without real R2 objects / DB job — that is expected for a dry dispatch test.

## Hardware & timeout

| Setting | Value | Rationale |
|--------|--------|-----------|
| GPU | `A10G` | 24 GB VRAM; good default for phone/tablet captures with Splatfacto |
| `max_duration` | `3600` s | Long-running COLMAP + Splatfacto jobs on typical phone/tablet captures |
| Larger captures | `A100` | Use if training OOMs on A10G (change `GPU_TYPE` in `worker.py`) |

## HTTP contract (reference)

### Dispatch (Trigger → Modal)

`POST` JSON body:

```json
{
  "jobId": "<uuid>",
  "orgId": "<uuid>",
  "spaceId": "<uuid>",
  "captureId": "<uuid>",
  "sourceKeys": ["orgs/<org>/digital-twin/<space>/<capture>/<file>"],
  "is360Flags": [true, false],
  "quality": "standard",
  "speed": "standard",
  "modelType": "gaussian_splat",
  "newAssetIds": ["<asset-uuid>"]
}
```

Response: `200` immediately, header `x-modal-run-id: <spawn id>`.

### Callback (Modal → Slate360)

`POST ${SITE_URL}/api/digital-twin/jobs/callback`

HMAC-SHA256 over the **exact** raw JSON body bytes, header `x-worker-signature: sha256=<hex>` (hex without prefix also accepted).

Success body:

```json
{
  "jobId": "<same>",
  "status": "completed",
  "outputKey": "orgs/<org>/digital-twin/<space>/models/<jobId>.spz",
  "modelFormat": "spz",
  "fileSizeBytes": 12345678,
  "newAssetIds": ["..."],
  "bounds": { "min": { "x": 0, "y": 0, "z": 0 }, "max": { "x": 1, "y": 1, "z": 1 } },
  "qualityMetrics": { }
}
```

Failure body:

```json
{
  "jobId": "<same>",
  "status": "failed",
  "errorLog": "<message>"
}
```

## Pipeline

1. Download `sourceKeys` from R2 (S3 API via boto3).
2. Photos → images; videos → FFmpeg frames (`fps=2`); 360° → FFmpeg equirect→perspective views.
3. `ns-process-data images` (COLMAP SfM).
4. `ns-train splatfacto`.
5. `ns-export gaussian-splat` → `.ply`.
6. `npx -y @playcanvas/splat-transform input.ply output.spz`.
7. Upload `.spz` to `orgs/{orgId}/digital-twin/{spaceId}/models/{jobId}.spz`.
8. Signed callback with bounds + metrics.
