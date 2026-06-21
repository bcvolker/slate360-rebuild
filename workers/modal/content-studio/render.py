"""
Slate360 Content Studio — Modal CPU render worker.

HTTP contract (POST, label `render`):
  Request JSON: jobId, orgId, specSnapshotKey, contentHash?, editProjectId?
  Response: HTTP 200 immediately, header x-modal-run-id: <spawn id>
  Async: downloads the frozen SlateContentEditSpec from R2, normalizes each clip
  (trim + speed + reverse + scale/pad to the output canvas), concatenates with the
  FFmpeg `concat` filter, encodes the final MP4, uploads to R2 Renders/, then POSTs
  a signed callback to ${SITE_URL}/api/content-studio/jobs/callback.

Consumes the canonical spec only — never live editor state. Color / transitions /
audio / titles graduate into this graph as they land (each a per-clip field).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import traceback
from pathlib import Path
from typing import Any

import modal
from fastapi.responses import JSONResponse

APP_NAME = "slate360-content-render"
SECRET_NAME = "slate360-thermal-worker"  # reused: R2_*, GPU_WORKER_SECRET_KEY, SITE_URL
WEB_ENDPOINT_LABEL = "render"
MAX_DURATION_SECONDS = 3000

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]==0.115.6", "boto3==1.35.99", "requests==2.32.3")
    .add_local_python_source("r2_utils")
)


def _sign(raw: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def post_callback(payload: dict[str, Any]) -> None:
    import requests

    site = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":")).encode()
    requests.post(
        f"{site}/api/content-studio/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )


def _has_audio(path: str) -> bool:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-select_streams", "a", "-show_entries", "stream=index",
         "-of", "json", path],
        capture_output=True, text=True,
    ).stdout
    try:
        return len(json.loads(out).get("streams", [])) > 0
    except Exception:  # noqa: BLE001
        return False


def _atempo_chain(speed: float) -> str:
    """atempo accepts 0.5–2.0 only; chain factors to hit any speed (= the video speed)."""
    parts: list[str] = []
    s = float(speed)
    while s > 2.0:
        parts.append("atempo=2.0")
        s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5")
        s *= 2.0
    parts.append(f"atempo={s:.4f}")
    return ",".join(parts)


def _build_filtergraph(clips: list[dict[str, Any]], has_audio: list[bool],
                       silence_idx: int, w: int, h: int, fps: int) -> str:
    """One filtergraph: per-clip trim/speed/reverse/scale-pad + concat to [vout][aout]."""
    chains: list[str] = []
    labels: list[str] = []
    for i, c in enumerate(clips):
        cin = float(c.get("cutInSec", 0) or 0)
        cout = float(c.get("cutOutSec", cin) or cin)
        speed = float(c.get("speed", 1) or 1)
        reverse = bool(c.get("reverse", False))
        seg = max(0.05, (cout - cin) / speed)

        v = f"[{i}:v]trim=start={cin:.4f}:end={cout:.4f},setpts=PTS-STARTPTS"
        if abs(speed - 1.0) > 1e-6:
            v += f",setpts=PTS/{speed:.6f}"
        if reverse:
            v += ",reverse"
        v += (f",scale={w}:{h}:force_original_aspect_ratio=decrease,"
              f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={fps},format=yuv420p[v{i}]")
        chains.append(v)

        if has_audio[i]:
            a = f"[{i}:a]atrim=start={cin:.4f}:end={cout:.4f},asetpts=PTS-STARTPTS"
            if reverse:
                a += ",areverse"
            if abs(speed - 1.0) > 1e-6:
                a += f",{_atempo_chain(speed)}"
            a += ",aformat=sample_rates=48000:channel_layouts=stereo[a{0}]".format(i)
        else:
            a = (f"[{silence_idx}:a]atrim=duration={seg:.4f},asetpts=PTS-STARTPTS,"
                 f"aformat=sample_rates=48000:channel_layouts=stereo[a{i}]")
        chains.append(a)
        labels.append(f"[v{i}][a{i}]")

    concat = f"{''.join(labels)}concat=n={len(clips)}:v=1:a=1[vout][aout]"
    return ";".join(chains + [concat])


@app.function(image=cpu_image, cpu=8, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def render_edit(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client, download_object, upload_file

    job_id = str(payload["jobId"])
    org_id = str(payload.get("orgId", ""))
    spec_key = str(payload["specSnapshotKey"])
    edit_project_id = str(payload.get("editProjectId") or "scratch")
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work = Path(f"/tmp/csr/{job_id}")
    work.mkdir(parents=True, exist_ok=True)

    try:
        post_callback({"jobId": job_id, "status": "processing", "progressPct": 5, "stage": "spec"})
        spec_path = str(work / "spec.json")
        download_object(s3, bucket, spec_key, spec_path)
        spec = json.loads(Path(spec_path).read_text())

        out = spec.get("output", {})
        w = int(out.get("width", 1920))
        h = int(out.get("height", 1080))
        fps = int(out.get("fps", 30))
        crf = int(out.get("crf", 20))
        preset = str(out.get("preset", "medium"))
        clips = spec.get("timeline", {}).get("clips", [])
        if not clips:
            post_callback({"jobId": job_id, "status": "failed", "error": {"message": "spec has no clips"}})
            return

        post_callback({"jobId": job_id, "status": "processing", "progressPct": 20, "stage": "download"})
        local: list[str] = []
        has_audio: list[bool] = []
        for i, c in enumerate(clips):
            dest = str(work / f"clip{i}.mp4")
            download_object(s3, bucket, c["storageKey"], dest)
            local.append(dest)
            has_audio.append(_has_audio(dest))

        post_callback({"jobId": job_id, "status": "processing", "progressPct": 55, "stage": "render"})
        silence_idx = len(local)
        fg = _build_filtergraph(clips, has_audio, silence_idx, w, h, fps)

        cmd: list[str] = ["ffmpeg", "-y"]
        for p in local:
            cmd += ["-i", p]
        # Silent-audio source for clips with no audio track.
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
        cmd += [
            "-filter_complex", fg,
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
            str(work / "out.mp4"),
        ]
        print("[render] ffmpeg:", " ".join(cmd), flush=True)  # raw command for debugging
        subprocess.run(cmd, capture_output=True, check=True)

        post_callback({"jobId": job_id, "status": "processing", "progressPct": 85, "stage": "upload"})
        out_key = f"orgs/{org_id}/Content Studio/Renders/{edit_project_id}/{job_id}.mp4"
        upload_file(s3, bucket, str(work / "out.mp4"), out_key, "video/mp4")

        post_callback({
            "jobId": job_id, "status": "completed", "progressPct": 100, "stage": "complete",
            "outputStorageKey": out_key,
            "outputs": [{"kind": "video", "storageKey": out_key, "width": w, "height": h}],
        })
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[-2000:] if isinstance(e.stderr, bytes) else str(e.stderr)[-2000:]
        post_callback({"jobId": job_id, "status": "failed", "error": {"message": f"ffmpeg failed: {stderr}"}})
    except Exception as e:  # noqa: BLE001
        post_callback({"jobId": job_id, "status": "failed",
                       "error": {"message": f"{e}\n{traceback.format_exc()[-1500:]}"}})


@app.function(image=cpu_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def web(body: dict[str, Any]):
    if not isinstance(body, dict) or not body.get("jobId"):
        return JSONResponse(status_code=400, content={"error": "jobId required"})
    if not body.get("specSnapshotKey"):
        return JSONResponse(status_code=400, content={"error": "specSnapshotKey required"})
    fc = render_edit.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
