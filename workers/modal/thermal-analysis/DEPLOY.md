# Slate360 Thermal Analysis Modal Worker

## Storage (Cloudflare R2)

All thermal assets (raw R-JPEG uploads, NPZ radiometric arrays, false-color previews, PDF/HTML reports) live in **Cloudflare R2** via the shared S3-compatible API (`lib/s3.ts` on Vercel, `r2_utils.py` in this worker). R2 is preferred over AWS S3 because **egress to clients and Modal is free**, which matters for large radiometric batches and share PDF downloads.

Required env (Vercel + Modal secret + Trigger): `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (e.g. `slate360-storage`), `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID`, `R2_REGION=auto`.

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
| `extract_analyze` | extract → analyze, **no report** (honest "decode + find" path) |
| `analyze` | Hot spots, cold bridges, linear streaks on already-extracted NPZ arrays |
| `align` | GPS-approximate twin-alignment manifest (COLMAP/LiDAR pending) |
| `report` | ReportLab PDF + self-contained HTML to R2 |
| `full_pipeline` | extract → analyze → align → report in one run |

> Deploy (UTF-8 env, Windows): `PYTHONIOENCODING=utf-8 python -m modal deploy worker.py`.
> Modal creds persist at `~/.modal.toml` (profile `bcvolker`); if the CLI is missing run
> `python -m pip install modal` — no re-login needed. See repo-root `CLAUDE.md`.

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
