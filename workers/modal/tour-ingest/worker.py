"""
Slate360 360° Tour Ingest — Modal CPU worker.

HTTP contract (POST /ingest):
  Request JSON: jobId, sceneId, orgId, tourId, sourceKey
  Produces web-ready derivatives from an uploaded equirectangular panorama:
    - thumbnail     (640px wide) for the Library grid / gallery / OG cards
    - normalized    (longest edge capped, progressive JPEG) for fast first paint
    - tiles_manifest (base.jpg + tiles/0/{col}_{row}.jpg + manifest.json) for the
      Photo Sphere Viewer 5.14.1 equirectangular-tiles-adapter
  then posts a signed callback so the scene flips processing -> ready.

Reuses the existing `slate360-thermal-worker` secret (R2 creds + SITE_URL +
GPU_WORKER_SECRET_KEY). Single-file on purpose (no sibling imports) for a simple deploy.
"""

from __future__ import annotations

import hashlib
import hmac
import io
import json
import os
import tempfile
import traceback
from pathlib import Path
from typing import Any

import modal
import requests
from fastapi.responses import JSONResponse

APP_NAME = "slate360-tour-ingest"
SECRET_NAME = "slate360-thermal-worker"
WEB_ENDPOINT_LABEL = "tour-ingest"
MAX_DURATION_SECONDS = 900
THUMB_WIDTH = 640
NORMALIZED_MAX_WIDTH = 8192  # cap the longest (horizontal) edge of equirect for the web
TILE_SIZE_CAP = 1024
TILE_BASE_WIDTH = 2048  # low-res full-panorama fallback for instant first paint

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libjpeg62-turbo", "zlib1g", "libvips42", "libvips-dev")
    .pip_install(
        "fastapi[standard]==0.115.6", "boto3==1.35.99", "pillow==11.0.0",
        "requests==2.32.3", "pyvips==2.2.3",
    )
)


def _s3_client():
    import boto3
    from botocore.config import Config

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint:
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        if account:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT (or CLOUDFLARE_ACCOUNT_ID) not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )


def _sign(raw: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def post_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    resp = requests.post(
        f"{site_url}/api/tours/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({resp.status_code}): {resp.text[:1000]}")


def _encode_jpeg(img, quality: int, progressive: bool) -> bytes:
    buf = io.BytesIO()
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(buf, format="JPEG", quality=quality, progressive=progressive, optimize=True)
    return buf.getvalue()


def _pick_tile_cols(width: int) -> int:
    if width <= 4096:
        return 8
    if width <= 8192:
        return 16
    return 32


def build_tile_pyramid(src_path: str, out_dir: str) -> dict[str, Any]:
    """Generate base.jpg + tiles/0/{col}_{row}.jpg + manifest.json under out_dir.

    Grid is chosen so `cols` is a power of two and the (possibly resized) source width
    is exactly divisible by `cols` -- this guarantees square, unpadded tiles and keeps
    tileSize <= 1024px, matching the PSV 5.14.1 equirectangular-tiles-adapter contract.
    Uses pyvips with default (random) access since tiling extracts arbitrary sub-regions,
    not a sequential scan.
    """
    import pyvips

    out = Path(out_dir)
    tiles_dir = out / "tiles" / "0"
    tiles_dir.mkdir(parents=True, exist_ok=True)

    img = pyvips.Image.new_from_file(src_path)
    w, h = img.width, img.height

    # Enforce (approximately) 2:1 equirectangular; crop-to-fit rather than distort.
    aspect = w / h if h else 0
    if abs(aspect - 2.0) > 0.02:
        target_h = round(w / 2)
        if target_h < h:
            top = (h - target_h) // 2
            img = img.extract_area(0, top, w, target_h)
        else:
            img = img.resize(1.0, vscale=target_h / h)
        w, h = img.width, img.height  # re-read actual dims; never trust a computed target

    cols = _pick_tile_cols(w)
    tile_size = w // cols
    if tile_size > TILE_SIZE_CAP:
        tile_size = TILE_SIZE_CAP
        cols = w // tile_size
    rows = cols // 2

    # Resize to a width evenly divisible by `cols` (no partial/padded edge tiles), then
    # hard-crop to the exact target pixel size. NOTE: a single-arg resize() scales BOTH
    # axes uniformly (there is no such thing as a "width-only" resize call) and floating
    # -point scale factors don't always land on an exact integer height, so trusting a
    # computed h2 without re-reading img.height caused a real bug here: a stale height
    # comparison triggered a redundant second vscale-only resize that compounded a ~1-2px
    # rounding drift into extract_area() running out of bounds on real (non-chart) photos.
    # extract_area() is pixel-exact and can never drift, so it's the final word on size;
    # embed() pads the (at most 1-2px) shortfall if a resize ever rounds down instead of up.
    w2 = max(cols * tile_size, w - (w % cols))
    h2 = w2 // 2
    if w2 != w:
        img = img.resize(w2 / w)
    if img.width < w2 or img.height < h2:
        img = img.embed(0, 0, max(img.width, w2), max(img.height, h2), extend="copy")
    if img.width != w2 or img.height != h2:
        img = img.extract_area(0, 0, w2, h2)
    w, h = w2, h2
    tile_size = w // cols

    for row in range(rows):
        for col in range(cols):
            tile = img.extract_area(col * tile_size, row * tile_size, tile_size, tile_size)
            tile.jpegsave(
                str(tiles_dir / f"{col}_{row}.jpg"),
                Q=85, strip=True, optimize_coding=True,
            )

    base_scale = min(1.0, TILE_BASE_WIDTH / w)
    base = img.resize(base_scale) if base_scale < 1.0 else img
    base.jpegsave(str(out / "base.jpg"), Q=82, strip=True, interlace=True, optimize_coding=True)

    manifest: dict[str, Any] = {
        "adapter": "equirectangular-tiles",
        "adapterVersion": "5.14.1",
        "sourceWidth": w,
        "sourceHeight": h,
        "baseKey": "base.jpg",
        "levels": [{
            "level": 0, "width": w, "height": h, "cols": cols, "rows": rows,
            "tileSize": tile_size, "keyPattern": "tiles/0/{col}_{row}.jpg",
        }],
    }
    (out / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return manifest


def _upload_tile_tree(s3, bucket: str, local_dir: str, remote_prefix: str) -> None:
    root = Path(local_dir)
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        content_type = "application/json" if path.suffix == ".json" else "image/jpeg"
        s3.put_object(
            Bucket=bucket, Key=f"{remote_prefix}/{rel}",
            Body=path.read_bytes(), ContentType=content_type,
        )


@app.function(image=cpu_image, cpu=2, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def process_tour_job(payload: dict[str, Any]) -> None:
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None  # equirect panoramas are large by design

    job_id = str(payload["jobId"])
    scene_id = str(payload["sceneId"])
    org_id = str(payload["orgId"])
    tour_id = str(payload["tourId"])
    source_key = str(payload["sourceKey"])

    bucket = os.environ["R2_BUCKET"]
    base = f"tours/{org_id}/{tour_id}/scenes/derivatives/{scene_id}"

    try:
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 10, "stage": "download"})
        s3 = _s3_client()
        raw = s3.get_object(Bucket=bucket, Key=source_key)["Body"].read()
        img = Image.open(io.BytesIO(raw))
        img.load()
        w, h = img.size

        # Thumbnail (keep aspect; equirect is ~2:1).
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 30, "stage": "thumbnail"})
        th = max(1, round(THUMB_WIDTH * h / w))
        thumb = img.resize((THUMB_WIDTH, th), Image.LANCZOS)
        thumb_key = f"{base}/thumb.jpg"
        s3.put_object(Bucket=bucket, Key=thumb_key, Body=_encode_jpeg(thumb, 80, False), ContentType="image/jpeg")

        # Normalized full (cap width, progressive JPEG for fast first paint).
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 50, "stage": "normalize"})
        if w > NORMALIZED_MAX_WIDTH:
            nh = max(1, round(NORMALIZED_MAX_WIDTH * h / w))
            norm = img.resize((NORMALIZED_MAX_WIDTH, nh), Image.LANCZOS)
        else:
            norm = img
        nw, nh = norm.size
        norm_key = f"{base}/normalized.jpg"
        s3.put_object(Bucket=bucket, Key=norm_key, Body=_encode_jpeg(norm, 85, True), ContentType="image/jpeg")

        # Tile pyramid (libvips, from the same downloaded bytes written to a temp file
        # so pyvips has random-access disk I/O for arbitrary tile crops).
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 65, "stage": "tiling"})
        with tempfile.TemporaryDirectory() as tmp:
            src_path = os.path.join(tmp, "source.jpg")
            with open(src_path, "wb") as f:
                f.write(raw)
            out_dir = os.path.join(tmp, "out")
            manifest = build_tile_pyramid(src_path, out_dir)
            _upload_tile_tree(s3, bucket, out_dir, f"{base}/tiles_root")
        manifest_key = f"{base}/tiles_root/manifest.json"
        tw, th2 = manifest["sourceWidth"], manifest["sourceHeight"]

        post_callback({
            "jobId": job_id,
            "sceneId": scene_id,
            "status": "completed",
            "progressPct": 100,
            "stage": "complete",
            "width": w,
            "height": h,
            "derivatives": [
                {"type": "thumbnail", "key": thumb_key, "width": THUMB_WIDTH, "height": th},
                {"type": "normalized", "key": norm_key, "width": nw, "height": nh},
                {"type": "tiles_manifest", "key": manifest_key, "width": tw, "height": th2},
            ],
        })
    except Exception as exc:  # noqa: BLE001
        post_callback({
            "jobId": job_id, "sceneId": scene_id, "status": "failed",
            "errorLog": str(exc)[:800], "trace": traceback.format_exc()[-2000:],
        })
        raise


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def ingest(body: dict):
    fc = process_tour_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
