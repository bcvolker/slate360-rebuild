# Slate360 Thermal Analysis Modal Worker

Deploy from this directory:

```bash
cd workers/modal/thermal-analysis
modal deploy worker.py
```

## HTTP contract

- **Endpoint:** `POST` label `process` on app `slate360-thermal-analysis`
- **Env var:** `MODAL_THERMAL_ENDPOINT` → full URL (Trigger.dev dispatch target)

## Job types

| `jobType` | Behavior |
|-----------|----------|
| `extract` | ExifTool + radiometric NPZ + false-color preview |
| `analyze` | Hot spots, cold bridges, linear streaks on NPZ arrays |
| `report` | ReportLab PDF + self-contained HTML to R2 |
| `full_pipeline` | extract → analyze → report in one run |

## Modal secret: `slate360-thermal-worker`

Required keys (mirror twin worker):

| Key | Purpose |
|-----|---------|
| `R2_ACCESS_KEY_ID` | R2 download/upload |
| `R2_SECRET_ACCESS_KEY` | R2 download/upload |
| `R2_BUCKET` | Bucket name |
| `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID` | R2 endpoint |
| `R2_REGION` | Usually `auto` |
| `SITE_URL` | Callback base, e.g. `https://www.slate360.ai` |
| `GPU_WORKER_SECRET_KEY` | HMAC callback signing |

## Callback

Signed POST to `${SITE_URL}/api/ops/thermal/jobs/callback` with header `x-worker-signature`.

Completed payloads may include:

- `captureResults` — extract outputs
- `analyzeResults` — per-capture `anomalies[]`
- `reportOutput` — `{ pdfKey, htmlKey, title, templateId }`
