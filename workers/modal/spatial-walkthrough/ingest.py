"""Spatial Walkthrough ingest — 4K 2:1 H.264 proxy + poster + SHA-256 + manifest.

Never mutates the master object. Callback HMAC matches twin/tour workers.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import traceback
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import modal
from fastapi.responses import JSONResponse

APP_NAME = "slate360-spatial-walkthrough"
SECRET_NAME = "slate360-thermal-worker"
WEB_ENDPOINT_LABEL = "spatial-walkthrough-ingest"
MAX_DURATION_SECONDS = 3600

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]==0.115.6", "boto3==1.35.99", "requests==2.32.3")
    .add_local_python_source("r2_utils")
    .add_local_python_source("bake_privacy")
)


def _sign(raw: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def callback_base_url(payload: dict[str, Any]) -> str:
    """Allow the originating deployment (preview or prod) to receive HMAC callbacks.

    Falls back to SITE_URL from the Modal secret. Hosts are allowlisted to prevent SSRF.
    """
    fallback = os.environ["SITE_URL"].rstrip("/")
    raw = str(payload.get("callbackBaseUrl") or fallback).strip().rstrip("/")
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    if parsed.scheme not in ("https", "http"):
        return fallback
    host = (parsed.hostname or "").lower()
    allowed = (
        host.endswith("slate360.ai")
        or host.endswith(".vercel.app")
        or host in {"localhost", "127.0.0.1"}
    )
    if not allowed:
        return fallback
    if host in {"localhost", "127.0.0.1"} and parsed.scheme != "http":
        return fallback
    if host not in {"localhost", "127.0.0.1"} and parsed.scheme != "https":
        return fallback
    return f"{parsed.scheme}://{parsed.netloc}"


def post_callback(payload: dict[str, Any], site: str) -> None:
    import requests

    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":")).encode()
    requests.post(
        f"{site}/api/spatial-walkthrough/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )


def gop_for_fps(fps: float) -> int:
    return max(1, int(round(fps if fps > 0 else 30.0)))


def encode_proxy(src: str, dest: str, width: int, height: int, gop: int) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", src,
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
            "-force_key_frames", "expr:gte(t,n_forced*1)",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            dest,
        ],
        capture_output=True,
        check=True,
    )


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _ffprobe(path: str) -> dict[str, Any]:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    fps = 30.0
    if v.get("r_frame_rate") and "/" in v["r_frame_rate"]:
        n, d = v["r_frame_rate"].split("/")
        fps = round(float(n) / float(d), 3) if float(d) else 30.0
    return {
        "durationSec": float(data.get("format", {}).get("duration", 0) or 0),
        "width": int(v.get("width", 0) or 0),
        "height": int(v.get("height", 0) or 0),
        "fps": fps,
    }


@app.function(image=cpu_image, cpu=8, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def ingest_clip(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client, download_object, upload_file

    job_id = str(payload["jobId"])
    clip_id = str(payload["clipId"])
    org_id = str(payload["orgId"])
    src_key = str(payload["sourceKey"])
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work = Path(tempfile.mkdtemp(prefix="sw-"))
    site = callback_base_url(payload)

    try:
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 8, "stage": "download"}, site)
        src = str(work / "master.mp4")
        download_object(s3, bucket, src_key, src)
        sha = _sha256_file(src)
        meta = _ffprobe(src)
        w, h = meta["width"], meta["height"]
        if h <= 0 or not (1.7 <= (w / h) <= 2.3):
            raise RuntimeError(f"Source is not ~2:1 equirectangular ({w}x{h})")

        gop = gop_for_fps(float(meta["fps"]))
        base = f"orgs/{org_id}/spatial-walkthrough/{clip_id}"
        poster_key = f"{base}/poster.jpg"
        manifest_key = f"{base}/manifest.json"

        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 35, "stage": "proxy"}, site)
        proxy = str(work / "proxy.mp4")
        proxy_w, proxy_h = 3840, 1920
        try:
            encode_proxy(src, proxy, proxy_w, proxy_h, gop)
        except subprocess.CalledProcessError:
            proxy_w, proxy_h = 2880, 1440
            encode_proxy(src, proxy, proxy_w, proxy_h, gop)
        proxy_key = f"{base}/proxy-{proxy_w}x{proxy_h}.mp4"
        upload_file(s3, bucket, proxy, proxy_key, "video/mp4")

        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 80, "stage": "poster"}, site)
        poster = str(work / "poster.jpg")
        seek = min(1.0, max(0.0, meta["durationSec"] / 8))
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(seek), "-i", src, "-frames:v", "1", "-vf", "scale=1920:960", poster],
            capture_output=True, check=True,
        )
        upload_file(s3, bucket, poster, poster_key, "image/jpeg")

        proxy_meta = _ffprobe(proxy)
        manifest = {
            "jobId": job_id,
            "clipId": clip_id,
            "masterKey": src_key,
            "masterSha256": sha,
            "proxyKey": proxy_key,
            "posterKey": poster_key,
            "ffmpeg": f"libx264 {proxy_w}x{proxy_h} yuv420p gop={gop} (~1s) faststart",
            "source": meta,
            "proxy": proxy_meta,
            "immutableMaster": True,
        }
        man_path = work / "manifest.json"
        man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        upload_file(s3, bucket, str(man_path), manifest_key, "application/json")

        post_callback({
            "jobId": job_id, "clipId": clip_id, "status": "completed", "progressPct": 100, "stage": "complete",
            "proxyKey": proxy_key, "posterKey": poster_key, "manifestKey": manifest_key,
            "masterSha256": sha,
            "durationSec": meta["durationSec"],
            "width": proxy_w,
            "height": proxy_h,
            "fps": meta["fps"],
            "captureMeta": {
                "projection": "2:1" if 1.9 <= (meta["width"] / max(meta["height"], 1)) <= 2.1 else "unknown",
                "flowState": "not-in-source",
                "horizonLeveled": False,
                "gyroAvailable": False,
                "reexportRequired": True,
                "sourceWidth": meta["width"],
                "sourceHeight": meta["height"],
                "note": "Insta360 gyro and FlowState are not present on the stitched MP4 ingest source. Re-export from Insta360 Studio with Horizon Lock and FlowState, then replace the master.",
            },
        }, site)
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[-1500:] if isinstance(e.stderr, bytes) else str(e.stderr)[-1500:]
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "failed", "errorLog": f"ffmpeg failed: {stderr}"}, site)
    except Exception as e:  # noqa: BLE001
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "failed",
                       "errorLog": f"{e}\n{traceback.format_exc()[-1500:]}"}, site)


@app.function(image=cpu_image, cpu=8, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def bake_public_proxy(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client, download_object, upload_file
    from bake_privacy import keep_segments, union_patches_at, interpolate_orientation

    job_id = str(payload["jobId"])
    clip_id = str(payload["clipId"])
    org_id = str(payload["orgId"])
    src_key = str(payload["sourceKey"])
    fallback = payload.get("operatorPatch") if isinstance(payload.get("operatorPatch"), dict) else {}
    regions_raw = payload.get("regions")
    if isinstance(regions_raw, list) and regions_raw and isinstance(regions_raw[0], list):
        regions: list[list[dict[str, Any]]] = regions_raw
    else:
        frames = payload.get("keyframes") if isinstance(payload.get("keyframes"), list) else []
        regions = [frames] if frames else []
    ori_raw = payload.get("orientation") if isinstance(payload.get("orientation"), dict) else {}
    ori_frames = ori_raw.get("keyframes") if isinstance(ori_raw.get("keyframes"), list) and ori_raw.get("bakeable") is not False else []
    skips = []
    for iv in payload.get("skips") if isinstance(payload.get("skips"), list) else []:
        if isinstance(iv, dict):
            skips.append((float(iv.get("start") or 0), float(iv.get("end") or 0)))
        elif isinstance(iv, (list, tuple)) and len(iv) >= 2:
            skips.append((float(iv[0]), float(iv[1])))

    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work = Path(tempfile.mkdtemp(prefix="sw-bake-"))
    site = callback_base_url(payload)
    print(f"privacy-bake start job={job_id} clip={clip_id} segs-pending src={src_key}", flush=True)
    try:
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 8, "stage": "privacy-bake"}, site)
        src = str(work / "proxy.mp4")
        download_object(s3, bucket, src_key, src)
        meta = _ffprobe(src)
        w, h = int(meta["width"] or 1920), int(meta["height"] or 960)
        duration = float(meta["durationSec"] or 0)
        kf_times = [_num_t(f) for frames in regions for f in frames]
        kf_times += [_num_t(f) for f in ori_frames]
        segments = keep_segments(duration, kf_times, skips)
        if not segments:
            segments = [(0.0, max(duration, 0.04))]

        pieces: list[str] = []
        for i, (start, end) in enumerate(segments):
            mid = (start + end) / 2
            patches = union_patches_at(regions, mid, fallback)
            mask = work / f"mask-{i}.png"
            _write_operator_masks_png(mask, w, h, patches)
            piece = str(work / f"piece-{i}.mp4")
            ori = interpolate_orientation(ori_frames, mid)
            _encode_privacy_piece(src, str(mask), piece, start, end - start, ori)
            pieces.append(piece)
            pct = 12 + int(70 * (i + 1) / max(len(segments), 1))
            post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": pct, "stage": "privacy-bake"}, site)

        out = str(work / "public.mp4")
        _concat_pieces(pieces, out, work)
        public_key = f"orgs/{org_id}/spatial-walkthrough/{clip_id}/public-proxy.mp4"
        upload_file(s3, bucket, out, public_key, "video/mp4")
        post_callback({
            "jobId": job_id, "clipId": clip_id, "status": "completed", "progressPct": 100,
            "stage": "privacy-bake", "publicProxyKey": public_key, "segmentCount": len(pieces),
        }, site)
    except Exception as e:  # noqa: BLE001
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "failed",
                       "errorLog": f"privacy bake: {e}\n{traceback.format_exc()[-800:]}"}, site)


def _num_t(frame: Any) -> float:
    if isinstance(frame, dict):
        try:
            return float(frame.get("t") or 0)
        except (TypeError, ValueError):
            return 0.0
    return 0.0


def _encode_privacy_piece(src: str, mask: str, dest: str, start: float, dur: float, ori: dict[str, float]) -> None:
    yaw, pitch, roll = float(ori.get("yawDeg") or 0), float(ori.get("pitchDeg") or 0), float(ori.get("rollDeg") or 0)
    vf = "[0:v][1:v]overlay=0:0:format=auto"
    if abs(yaw) > 0.05 or abs(pitch) > 0.05 or abs(roll) > 0.05:
        vf = f"[0:v]v360=e:e:yaw={yaw}:pitch={pitch}:roll={roll}[rot];[rot][1:v]overlay=0:0:format=auto"
    subprocess.run(
        [
            "ffmpeg", "-y", "-ss", f"{start:.3f}", "-t", f"{max(dur, 0.04):.3f}", "-i", src, "-i", mask,
            "-filter_complex", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart",
            dest,
        ],
        capture_output=True,
        check=True,
    )


def _concat_pieces(pieces: list[str], dest: str, work: Path) -> None:
    dest_path = Path(dest)
    if len(pieces) == 1:
        if dest_path.exists():
            dest_path.unlink()
        Path(pieces[0]).replace(dest)
        return
    listing = work / "concat.txt"
    listing.write_text("".join(f"file '{p.replace(chr(92), '/')}'\n" for p in pieces), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", "-movflags", "+faststart", dest],
        capture_output=True,
        check=True,
    )


def _write_operator_masks_png(path: Path, width: int, height: int, patches: list[dict[str, Any]]) -> None:
    if not patches:
        patches = [{}]
    src_w, src_h = max(width // 4, 480), max(height // 4, 240)
    ppm = path.with_suffix(".ppm")
    specs = []
    for patch in patches:
        nadir = float(patch.get("nadirVerticalExtent") or patch.get("nadirRadius") or 0.22)
        yaw_c = float(patch.get("rearYawCenter") if patch.get("rearYawCenter") is not None else 180)
        yaw_w = float(patch.get("rearYawWidth") or 64)
        pmin = float(patch.get("pitchMin") if patch.get("pitchMin") is not None else -88)
        pmax = float(patch.get("pitchMax") if patch.get("pitchMax") is not None else -18)
        y0 = int(src_h * (1 - nadir))
        yaw_min = ((yaw_c - yaw_w / 2 + 180) % 360) - 180
        yaw_max = ((yaw_c + yaw_w / 2 + 180) % 360) - 180
        specs.append((y0, yaw_min, yaw_max, pmin, pmax))

    def in_yaw(yaw: float, yaw_min: float, yaw_max: float) -> bool:
        if yaw_min <= yaw_max:
            return yaw_min <= yaw <= yaw_max
        return yaw >= yaw_min or yaw <= yaw_max

    with ppm.open("wb") as f:
        f.write(f"P6\n{src_w} {src_h}\n255\n".encode())
        for y in range(src_h):
            pitch = 90 - (y / max(src_h - 1, 1)) * 180
            buf = bytearray(src_w * 3)
            for x in range(src_w):
                cover = False
                yaw = (x / max(src_w, 1)) * 360 - 180
                for y0, yaw_min, yaw_max, pmin, pmax in specs:
                    if y >= y0:
                        cover = True
                        break
                    if pmin <= pitch <= pmax and in_yaw(yaw, yaw_min, yaw_max):
                        cover = True
                        break
                buf[x * 3:x * 3 + 3] = b"\x00\x00\x00" if cover else b"\xff\x00\xff"
            f.write(buf)
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(ppm),
            "-vf", f"scale={width}:{height}:flags=neighbor,colorkey=0xFF00FF:0.1:0.0,format=rgba",
            str(path),
        ],
        capture_output=True,
        check=True,
    )


@app.function(image=cpu_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def web(body: dict[str, Any]):
    if not isinstance(body, dict) or not body.get("jobId") or not body.get("clipId"):
        return JSONResponse(status_code=400, content={"error": "jobId and clipId required"})
    if not body.get("sourceKey"):
        return JSONResponse(status_code=400, content={"error": "sourceKey required"})
    if body.get("mode") == "privacy-bake":
        fc = bake_public_proxy.spawn(body)
    else:
        fc = ingest_clip.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
