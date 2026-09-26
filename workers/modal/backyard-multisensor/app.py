"""Backyard multi-sensor fusion experiment (isolated). Never touches production project rows or production objects
except for READ-ONLY copies of the iPhone capture into the experimental namespace.

R2 root: experimental/backyard-multisensor/2026-09-24/"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

import modal

APP = "slate360-backyard-exp"
ROOT = "experimental/backyard-multisensor/2026-09-24"
app = modal.App(APP)
secret = modal.Secret.from_name("slate360-twin-worker")
img = (modal.Image.debian_slim(python_version="3.11").apt_install("ffmpeg", "libgl1", "libglib2.0-0", "exiftool")
       .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "pillow", "av", "scipy"))


def _s3():
    import boto3
    from botocore.config import Config
    ep = os.environ.get("R2_ENDPOINT") or f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    return boto3.client("s3", endpoint_url=ep, aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto",
                        config=Config(read_timeout=300, retries={"max_attempts": 8, "mode": "adaptive"},
                                      request_checksum_calculation="when_required", response_checksum_validation="when_required"))


def _bucket():
    return os.environ["R2_BUCKET"]


@app.function(image=img, cpu=4.0, memory=8192, timeout=3 * 3600, secrets=[secret])
def verify_intake(manifest_key: str) -> dict:
    """Independent SHA-256 of every uploaded object (streamed from R2) vs the local pre-upload hash."""
    s3, b = _s3(), _bucket()
    man = json.loads(s3.get_object(Bucket=b, Key=manifest_key)["Body"].read())
    res, bad = {}, []
    for rel, rec in man["objects"].items():
        o = s3.get_object(Bucket=b, Key=rec["key"])
        h = hashlib.sha256(); n = 0
        for chunk in iter(lambda: o["Body"].read(16 * 2**20), b""):
            h.update(chunk); n += len(chunk)
        ok = n == rec["bytes"] and h.hexdigest() == rec["localSha256"]
        res[rel] = {"key": rec["key"], "bytes": n, "cloudSha256": h.hexdigest(), "match": ok}
        if not ok:
            bad.append(rel)
    out = {"objects": len(res), "mismatches": bad, "verified": res}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/intake_cloud_verification.json", Body=json.dumps(out, indent=1).encode())
    return {"objects": len(res), "mismatches": bad}


@app.function(image=img, cpu=8.0, memory=32768, timeout=3 * 3600, secrets=[secret])
def probe_x4(key: str, sample_every_s: float = 1.0) -> dict:
    """Streams, metadata and a per-second quality profile of BOTH physical lens streams (no stitching)."""
    import av
    import cv2
    import numpy as np
    s3, b = _s3(), _bucket()
    local = "/tmp/x4.insv"
    s3.download_file(b, key, local)
    r = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", local], capture_output=True, text=True)
    info = json.loads(r.stdout)
    streams = [{k: s.get(k) for k in ("index", "codec_type", "codec_name", "profile", "pix_fmt", "width", "height", "avg_frame_rate",
                                       "nb_frames", "duration", "bit_rate", "color_range", "color_space", "color_transfer",
                                       "color_primaries", "tags")} for s in info["streams"]]
    et = subprocess.run(["exiftool", "-j", "-G", "-a", "-ee", local], capture_output=True, text=True)
    try:
        exif = json.loads(et.stdout)[0]
    except Exception:  # noqa: BLE001
        exif = {"error": et.stderr[-500:]}
    keep = {k: v for k, v in exif.items() if any(t in k for t in ("Exposure", "ISO", "Shutter", "WhiteBalance", "Gyro", "Firmware",
                                                                    "Model", "Make", "Date", "GPS", "Lens", "Serial", "Frame", "Duration"))}
    prof = {}
    c = av.open(local)
    vids = [s for s in c.streams.video]
    for vs in vids:
        vs.thread_type = "AUTO"
    fps = float(vids[0].average_rate) if vids else 30.0
    step = max(1, int(round(fps * sample_every_s)))
    for vi, vs in enumerate(vids):
        c = av.open(local); v = c.streams.video[vi]; v.thread_type = "AUTO"
        rows = []
        for i, fr in enumerate(c.decode(v)):
            if i % step:
                continue
            g = fr.to_ndarray(format="gray")
            H, W = g.shape
            cy, cx = H // 2, W // 2
            ring = g[cy - int(H * .3):cy + int(H * .3), cx - int(W * .3):cx + int(W * .3)]    # inside the fisheye circle
            small = cv2.resize(ring, (ring.shape[1] // 2, ring.shape[0] // 2), interpolation=cv2.INTER_AREA)
            lap = float(cv2.Laplacian(small, cv2.CV_32F).var())
            gx = cv2.Sobel(small, cv2.CV_32F, 1, 0, 3); gy = cv2.Sobel(small, cv2.CV_32F, 0, 1, 3)
            ex, ey = float((gx ** 2).mean()), float((gy ** 2).mean())
            rows.append({"t": round(float(fr.time), 2), "lapVar": round(lap, 1), "meanLuma": round(float(ring.mean()), 1),
                         "clipHi": round(float((ring >= 250).mean()), 4), "clipLo": round(float((ring <= 5).mean()), 4),
                         "blurAnisotropy": round(max(ex, ey) / max(min(ex, ey), 1e-6), 2)})
        prof[f"lens{vi}"] = rows
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/x4_probe.json",
                  Body=json.dumps({"streams": streams, "format": info.get("format"), "exif": keep, "profile": prof}, indent=1, default=str).encode())
    summ = {}
    for L, rows in prof.items():
        lv = np.array([r["lapVar"] for r in rows])
        summ[L] = {"samples": len(rows), "lapVarP10": float(np.percentile(lv, 10)), "lapVarMedian": float(np.median(lv)),
                   "lapVarP90": float(np.percentile(lv, 90)), "meanLuma": float(np.mean([r["meanLuma"] for r in rows])),
                   "clipHiMean": float(np.mean([r["clipHi"] for r in rows]))}
    return {"streams": streams, "format": {k: info["format"].get(k) for k in ("duration", "size", "bit_rate", "format_name")},
            "exifKeys": len(keep), "exif": {k: keep[k] for k in list(keep)[:40]}, "summary": summ}


@app.function(image=img, cpu=16.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def probe_gopro(prefix: str) -> dict:
    """EXIF + quality for every GoPro still. The GoPro clock is WRONG: absolute timestamps are recorded as untrusted."""
    import io
    import cv2
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    keys = []
    tok = None
    while True:
        kw = {"Bucket": b, "Prefix": prefix}
        if tok:
            kw["ContinuationToken"] = tok
        r = s3.list_objects_v2(**kw)
        keys += [o["Key"] for o in r.get("Contents", []) if o["Key"].upper().endswith(".JPG")]
        if not r.get("IsTruncated"):
            break
        tok = r["NextContinuationToken"]
    os.makedirs("/tmp/gp", exist_ok=True)

    def one(k):
        p = f"/tmp/gp/{Path(k).name}"
        s3.download_file(b, k, p)
        im = cv2.imread(p, cv2.IMREAD_COLOR); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        H, W = g.shape
        c = g[H // 4:3 * H // 4, W // 4:3 * W // 4]
        lap = float(cv2.Laplacian(c, cv2.CV_32F).var())
        gx = cv2.Sobel(c, cv2.CV_32F, 1, 0, 3); gy = cv2.Sobel(c, cv2.CV_32F, 0, 1, 3)
        ex, ey = float((gx ** 2).mean()), float((gy ** 2).mean())
        return {"key": k, "name": Path(k).name, "width": W, "height": H, "lapVarCentre": round(lap, 1),
                "meanLuma": round(float(g.mean()), 1), "clipHi": round(float((g >= 250).mean()), 4),
                "clipLo": round(float((g <= 5).mean()), 4), "blurAnisotropy": round(max(ex, ey) / max(min(ex, ey), 1e-6), 2)}
    with ThreadPoolExecutor(16) as ex:
        rows = list(ex.map(one, sorted(keys)))
    et = subprocess.run(["exiftool", "-j", "-n", "-Make", "-Model", "-ExposureTime", "-ISO", "-FNumber", "-FocalLength",
                         "-FocalLengthIn35mmFormat", "-WhiteBalance", "-DateTimeOriginal", "-SubSecTimeOriginal",
                         "-ExposureProgram", "-DigitalZoomRatio", "-Software", "-ImageWidth", "-ImageHeight",
                         "-FieldOfView", "-SerialNumber", "/tmp/gp"], capture_output=True, text=True)
    ex_by = {Path(d["SourceFile"]).name: d for d in json.loads(et.stdout)}
    for r in rows:
        r["exif"] = {k: v for k, v in ex_by.get(r["name"], {}).items() if k != "SourceFile"}
        r["timestampTrust"] = "UNTRUSTED (GoPro clock known wrong; order only)"
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/gopro_probe.json", Body=json.dumps(rows, indent=1).encode())
    lv = np.array([r["lapVarCentre"] for r in rows])
    ets = [r["exif"].get("ExposureTime") for r in rows if r["exif"].get("ExposureTime")]
    isos = [r["exif"].get("ISO") for r in rows if r["exif"].get("ISO")]
    return {"count": len(rows), "resolutions": sorted({(r["width"], r["height"]) for r in rows}),
            "models": sorted({str(r["exif"].get("Model")) for r in rows}),
            "exposureTime": {"min": min(ets) if ets else None, "median": float(np.median(ets)) if ets else None, "max": max(ets) if ets else None},
            "iso": {"min": min(isos) if isos else None, "median": float(np.median(isos)) if isos else None, "max": max(isos) if isos else None},
            "focalMm": sorted({r["exif"].get("FocalLength") for r in rows}), "focal35": sorted({r["exif"].get("FocalLengthIn35mmFormat") for r in rows}),
            "fov": sorted({str(r["exif"].get("FieldOfView")) for r in rows}),
            "lapVar": {"p10": float(np.percentile(lv, 10)), "median": float(np.median(lv)), "p90": float(np.percentile(lv, 90))},
            "meanLuma": float(np.mean([r["meanLuma"] for r in rows])), "clipHiMean": float(np.mean([r["clipHi"] for r in rows])),
            "exifDateFirst": rows[0]["exif"].get("DateTimeOriginal"), "exifDateLast": rows[-1]["exif"].get("DateTimeOriginal"),
            "sample": {k: rows[0]["exif"].get(k) for k in ("Make", "Model", "Software", "WhiteBalance", "ExposureProgram", "FNumber")}}


@app.function(image=img, cpu=16.0, memory=65536, timeout=4 * 3600, secrets=[secret])
def x4_select_extract(key: str, target_pairs: int = 320) -> dict:
    """Pass 1: sharpness of EVERY frame of both physical lens streams (1/4-scale centre region, Laplacian var).
    Pass 2: one exposure per equal time window = argmax of min(lens0, lens1) sharpness (a simultaneous pair); decode
    those frames losslessly per lens (no stitching) to prepared/x4/lens{0,1}/ in R2 + a selection manifest."""
    import av
    import cv2
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    local = "/tmp/x4.insv"
    s3.download_file(b, key, local)

    def score_stream(vi):
        c = av.open(local); v = c.streams.video[vi]; v.thread_type = "AUTO"
        out = []
        for fr in c.decode(v):
            g = fr.to_ndarray(format="gray")
            H, W = g.shape
            ring = g[int(H * .2):int(H * .8), int(W * .2):int(W * .8)]
            s = cv2.resize(ring, (ring.shape[1] // 4, ring.shape[0] // 4), interpolation=cv2.INTER_AREA)
            out.append((float(fr.time), float(cv2.Laplacian(s, cv2.CV_32F).var()), float(ring.mean()),
                        float((ring >= 250).mean())))
        return out
    with ThreadPoolExecutor(2) as ex:
        s0, s1 = ex.map(score_stream, (0, 1))
    n = min(len(s0), len(s1))
    q = np.array([min(s0[i][1], s1[i][1]) for i in range(n)])
    edges = np.linspace(0, n, target_pairs + 1).astype(int)
    sel = []
    for a, bb in zip(edges[:-1], edges[1:]):
        if bb > a:
            sel.append(int(a + np.argmax(q[a:bb])))
    # reject pairs clearly blurred vs their neighbourhood (motion blur) -- recorded, not silently dropped
    med = np.median(q)
    rec = []
    for i in sel:
        rec.append({"frame": i, "t": round(s0[i][0], 3), "sharp0": round(s0[i][1], 1), "sharp1": round(s1[i][1], 1),
                    "luma0": round(s0[i][2], 1), "luma1": round(s1[i][2], 1), "clip0": round(s0[i][3], 4), "clip1": round(s1[i][3], 4),
                    "relSharp": round(float(q[i] / max(med, 1e-6)), 3), "admitted": bool(q[i] >= 0.5 * med)})
    want = {r["frame"] for r in rec if r["admitted"]}
    os.makedirs("/tmp/x4f/lens0", exist_ok=True); os.makedirs("/tmp/x4f/lens1", exist_ok=True)
    for vi in (0, 1):
        c = av.open(local); v = c.streams.video[vi]; v.thread_type = "AUTO"
        for i, fr in enumerate(c.decode(v)):
            if i in want:
                cv2.imwrite(f"/tmp/x4f/lens{vi}/x4_f{i:05d}.png", fr.to_ndarray(format="bgr24"))
            if i > max(want):
                break
    up = 0
    for vi in (0, 1):
        for p in sorted(Path(f"/tmp/x4f/lens{vi}").glob("*.png")):
            s3.upload_file(str(p), b, f"{ROOT}/prepared/x4/lens{vi}/{p.name}"); up += 1
    manifest = {"source": key, "framesPerStream": n, "fps": 30000 / 1001, "targetPairs": target_pairs,
                "selection": "per equal time window: argmax(min(lens0,lens1) Laplacian var, 1/4-scale centre region)",
                "admissionRule": "min-lens sharpness >= 0.5 x median of all frames", "pairs": rec,
                "decode": "PyAV default bgr24 (full range BT.709), lossless PNG, no stitching"}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/x4_selection.json", Body=json.dumps(manifest, indent=1).encode())
    qa = np.array([r["relSharp"] for r in rec])
    return {"framesPerStream": n, "selected": len(rec), "admitted": len(want), "uploadedImages": up,
            "relSharpSelected": {"p10": float(np.percentile(qa, 10)), "median": float(np.median(qa))},
            "medianMinSharpAll": float(med)}


@app.function(image=img, cpu=8.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def iphone_intake(assets: list) -> dict:
    """READ-ONLY server-side copy of the ready iPhone capture assets into the experiment namespace (production objects
    and rows are never modified), independent SHA-256 of each copy, then an audit of photos + sidecars."""
    import gzip
    import io
    import cv2
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    sub = {"photo": "iphone", "lidar_depth": "lidar", "ply_lidar": "lidar", "lidar_poses": "arkit", "other": "arkit"}

    def one(a):
        dst = f"{ROOT}/raw/{sub.get(a['asset_kind'], 'iphone')}/{Path(a['storage_key']).name}"
        s3.copy_object(Bucket=b, Key=dst, CopySource={"Bucket": b, "Key": a["storage_key"]})
        o = s3.get_object(Bucket=b, Key=dst)
        h = hashlib.sha256(); n = 0
        for chunk in iter(lambda: o["Body"].read(16 * 2**20), b""):
            h.update(chunk); n += len(chunk)
        return {"assetId": a["id"], "kind": a["asset_kind"], "productionKey": a["storage_key"], "key": dst, "bytes": n,
                "dbBytes": a["file_size_bytes"], "sha256": h.hexdigest(), "contentType": a["content_type"]}
    with ThreadPoolExecutor(16) as ex:
        recs = list(ex.map(one, assets))
    man = {"captureId": "bd5596d2-a80f-40d4-9427-222bdcc61614", "project": "Quick Scans (3f313844-...)",
           "note": "server-side read-only copies; 197 photos never finished uploading (still 'uploading' in production)",
           "objects": recs}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/iphone_intake.json", Body=json.dumps(man, indent=1).encode())
    # audit: EXIF of all photos (exiftool on local copies), image quality, sidecar structure
    os.makedirs("/tmp/ip", exist_ok=True)
    photos = [r for r in recs if r["kind"] == "photo"]
    def dl(r):
        p = f"/tmp/ip/{Path(r['key']).name}"; s3.download_file(b, r["key"], p)
        im = cv2.imread(p, cv2.IMREAD_GRAYSCALE)
        H, W = im.shape; c = im[H // 4:3 * H // 4, W // 4:3 * W // 4]
        return {"name": Path(p).name, "w": W, "h": H, "lapVarCentre": round(float(cv2.Laplacian(c, cv2.CV_32F).var()), 1),
                "meanLuma": round(float(im.mean()), 1), "clipHi": round(float((im >= 250).mean()), 4)}
    with ThreadPoolExecutor(16) as ex:
        q = list(ex.map(dl, photos))
    et = subprocess.run(["exiftool", "-j", "-n", "-Make", "-Model", "-LensModel", "-FocalLength", "-FocalLengthIn35mmFormat",
                         "-ExposureTime", "-ISO", "-FNumber", "-WhiteBalance", "-DateTimeOriginal", "-SubSecTimeOriginal",
                         "-OffsetTimeOriginal", "-ImageWidth", "-ImageHeight", "-Software", "-CompositeImage", "-HDRGain",
                         "-Orientation", "/tmp/ip"], capture_output=True, text=True)
    ex_by = {Path(d["SourceFile"]).name: d for d in json.loads(et.stdout or "[]")}
    for r in q:
        r["exif"] = {k: v for k, v in ex_by.get(r["name"], {}).items() if k != "SourceFile"}
    side = {}
    for r in recs:
        if r["kind"] in ("lidar_poses", "other"):
            raw = s3.get_object(Bucket=b, Key=r["key"])["Body"].read()
            if r["key"].endswith(".gz"):
                raw = gzip.decompress(raw)
            try:
                j = json.loads(raw)
                def shape(x, d=0):
                    if d > 3: return "..."
                    if isinstance(x, dict): return {k: shape(v, d + 1) for k, v in list(x.items())[:25]}
                    if isinstance(x, list): return [f"list[{len(x)}]", shape(x[0], d + 1) if x else None]
                    return type(x).__name__
                side[r["kind"]] = {"bytes": len(raw), "structure": shape(j),
                                   "sample": json.dumps(j if not isinstance(j, list) else j[:1], default=str)[:1500]}
            except Exception as e:  # noqa: BLE001
                side[r["kind"]] = {"bytes": len(raw), "head": raw[:300].hex(), "error": str(e)[:200]}
        if r["kind"] == "lidar_depth":
            o = s3.get_object(Bucket=b, Key=r["key"], Range="bytes=0-511")["Body"].read()
            side["lidar_depth"] = {"bytes": r["bytes"], "head_ascii": o[:200].decode("latin1", "replace"), "head_hex": o[:64].hex()}
        if r["kind"] == "ply_lidar":
            raw = gzip.decompress(s3.get_object(Bucket=b, Key=r["key"])["Body"].read())
            end = raw.find(b"end_header")
            side["ply_lidar"] = {"bytes": len(raw), "header": raw[:end].decode("latin1", "replace")[:800]}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/iphone_probe.json", Body=json.dumps({"photos": q, "sidecars": side}, indent=1, default=str).encode())
    lv = np.array([r["lapVarCentre"] for r in q])
    return {"copied": len(recs), "sizeMismatch": [r["key"] for r in recs if r["bytes"] != r["dbBytes"]],
            "photos": len(q), "resolutions": sorted({(r["w"], r["h"]) for r in q}),
            "models": sorted({str(r["exif"].get("Model")) for r in q}), "lenses": sorted({str(r["exif"].get("LensModel")) for r in q}),
            "focal35": sorted({r["exif"].get("FocalLengthIn35mmFormat") for r in q}),
            "exposure": [min(r["exif"].get("ExposureTime") or 9 for r in q), max(r["exif"].get("ExposureTime") or 0 for r in q)],
            "iso": [min(r["exif"].get("ISO") or 99999 for r in q), max(r["exif"].get("ISO") or 0 for r in q)],
            "dateFirst": q[0]["exif"].get("DateTimeOriginal"), "software": sorted({str(r["exif"].get("Software")) for r in q})[:5],
            "lapVar": {"p10": float(np.percentile(lv, 10)), "median": float(np.median(lv)), "p90": float(np.percentile(lv, 90))},
            "sidecars": {k: {kk: (vv if kk != "sample" else vv[:600]) for kk, vv in v.items()} for k, v in side.items()}}


gpu_img = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0")
           .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "pillow")
           .pip_install("torch==2.5.1", "torchvision==0.20.1", index_url="https://download.pytorch.org/whl/cu121")
           .run_commands("python -c \"import torchvision; torchvision.models.detection.maskrcnn_resnet50_fpn_v2(weights='DEFAULT')\""))


def _list(s3, b, prefix, exts=(".png", ".jpg", ".jpeg")):
    keys, tok = [], None
    while True:
        kw = {"Bucket": b, "Prefix": prefix}
        if tok:
            kw["ContinuationToken"] = tok
        r = s3.list_objects_v2(**kw)
        keys += [o["Key"] for o in r.get("Contents", []) if o["Key"].lower().endswith(exts)]
        if not r.get("IsTruncated"):
            break
        tok = r["NextContinuationToken"]
    return sorted(keys)


@app.function(image=gpu_img, gpu="T4", cpu=8.0, memory=32768, timeout=3 * 3600, secrets=[secret])
def build_masks() -> dict:
    """Keep-masks (white = use) for every candidate image, per camera group:
       1 person/animal: Mask R-CNN (torchvision, COCO person/dog/cat, score >= 0.5), dilated 12 px @ full res
       2 fixed-to-camera: per-group temporal std on 1/8-scale luma over all frames; std < 6 -> rig / stick / hand /
         other camera; morph-cleaned, dilated
       3 X4 only: fisheye image circle (luma > 8 in the temporal max)
    Contact sheets (image with red overlay) are written for visual validation."""
    import cv2
    import numpy as np
    import torch
    import torchvision
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    groups = {"x4_lens0": _list(s3, b, f"{ROOT}/prepared/x4/lens0/"), "x4_lens1": _list(s3, b, f"{ROOT}/prepared/x4/lens1/"),
              "gopro": _list(s3, b, f"{ROOT}/raw/gopro/"), "iphone": _list(s3, b, f"{ROOT}/raw/iphone/")}
    model = torchvision.models.detection.maskrcnn_resnet50_fpn_v2(weights="DEFAULT").eval().cuda()
    KEEP_CLS = {1, 17, 18}   # person, cat, dog
    stats = {}
    for g, keys in groups.items():
        os.makedirs(f"/tmp/m/{g}", exist_ok=True)
        def dl(k):
            p = f"/tmp/m/{g}/{Path(k).name}"; s3.download_file(b, k, p); return p
        with ThreadPoolExecutor(16) as ex:
            paths = list(ex.map(dl, keys))
        # --- temporal fixed-to-camera analysis, grouped by image size
        by_size = {}
        smalls = {}
        for p in paths:
            im = cv2.imread(p, cv2.IMREAD_GRAYSCALE)
            by_size.setdefault(im.shape, []).append(p)
            smalls[p] = cv2.resize(im, (im.shape[1] // 8, im.shape[0] // 8), interpolation=cv2.INTER_AREA).astype(np.float32)
        fixed = {}
        for shp, ps in by_size.items():
            stack = np.stack([smalls[p] for p in ps])
            std = stack.std(0); mx = stack.max(0)
            m = (std < 6.0).astype(np.uint8)
            m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            circle = (mx > 8).astype(np.uint8) if g.startswith("x4") else np.ones_like(m)
            fixed[shp] = (cv2.resize(m, (shp[1], shp[0]), interpolation=cv2.INTER_NEAREST),
                          cv2.resize(circle, (shp[1], shp[0]), interpolation=cv2.INTER_NEAREST), len(ps))
        # --- person masks
        n_person = 0; frac = []
        sheet = []
        for i, p in enumerate(paths):
            bgr = cv2.imread(p); H, W = bgr.shape[:2]
            sc = 1333.0 / max(H, W)
            small = cv2.resize(bgr, (int(W * sc), int(H * sc)), interpolation=cv2.INTER_AREA)
            t = torch.from_numpy(small[..., ::-1].copy()).permute(2, 0, 1).float().div(255).cuda()
            with torch.no_grad():
                out = model([t])[0]
            pm = np.zeros(small.shape[:2], bool)
            for lab, sco, mk in zip(out["labels"].tolist(), out["scores"].tolist(), out["masks"]):
                if lab in KEEP_CLS and sco >= 0.5:
                    pm |= mk[0].cpu().numpy() > 0.5
            person = cv2.resize(pm.astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST)
            if person.any():
                n_person += 1
                person = cv2.dilate(person, np.ones((25, 25), np.uint8))
            fx, circ, _ = fixed[(H, W)]
            fixd = cv2.dilate(fx, np.ones((31, 31), np.uint8))
            keep = ((circ > 0) & (person == 0) & (fixd == 0)).astype(np.uint8) * 255
            frac.append(float((keep > 0).mean()))
            name = Path(p).stem + ".png"
            cv2.imwrite(f"/tmp/m/{g}_{name}", keep)
            s3.upload_file(f"/tmp/m/{g}_{name}", b, f"{ROOT}/masks/{g}/{name}")
            if i % max(1, len(paths) // 12) == 0 and len(sheet) < 12:
                ov = bgr.copy(); ov[keep == 0] = (0.4 * ov[keep == 0] + [0, 0, 150]).astype(np.uint8)
                sheet.append(cv2.resize(ov, (480, int(480 * H / W))))
            os.remove(p)
        rows = [np.hstack(sheet[j:j + 4]) for j in range(0, len(sheet) - len(sheet) % 4, 4)] if len(sheet) >= 4 else [np.hstack(sheet)]
        ok, jpg = cv2.imencode(".jpg", np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
        s3.put_object(Bucket=b, Key=f"{ROOT}/masks/_sheets/{g}.jpg", Body=jpg.tobytes())
        stats[g] = {"images": len(paths), "withPersonDetected": n_person,
                    "fixedToCameraFraction": {f"{k[1]}x{k[0]}": round(float((v[0] > 0).mean()), 4) for k, v in fixed.items()},
                    "keepFractionMedian": round(float(np.median(frac)), 4), "keepFractionMin": round(float(np.min(frac)), 4)}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/masks_summary.json", Body=json.dumps(stats, indent=1).encode())
    return stats


@app.function(image=img, cpu=1.0, timeout=600, secrets=[secret])
def fetch_bytes(key: str) -> bytes:
    s3, b = _s3(), _bucket()
    return s3.get_object(Bucket=b, Key=key)["Body"].read()


colmap_img = (modal.Image.from_registry("nvidia/cuda:12.8.1-runtime-ubuntu22.04", add_python="3.11")
              .apt_install("curl", "libgl1", "libglib2.0-0")
              .run_commands("curl -fsSL -o /tmp/mc.sh https://repo.anaconda.com/miniconda/Miniconda3-py311_25.1.1-2-Linux-x86_64.sh"
                            " && bash /tmp/mc.sh -b -p /opt/conda && rm /tmp/mc.sh")
              .run_commands("/opt/conda/bin/conda create -n colmap312 -y -c conda-forge colmap=3.12.6=cuda*"
                            " && /opt/conda/envs/colmap312/bin/colmap -h 2>&1 | head -2")
              .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "pycolmap==4.2.0"))
COLMAP = "/opt/conda/envs/colmap312/bin/colmap"


SOLVE = "experimental/backyard-multisensor/2026-09-24/camera-solves/v1"
# Physically derived priors (refined by BA): X4 equidistant fisheye ~200 deg over a 3840 circle; GoPro HERO8 wide
# ~118 deg HFOV at 4000 px; iPhone wide_1x from ARKit fx 1329 @ 1920 -> 2791 @ 4032.
CAM_PRIORS = {"x4_lens0": ("OPENCV_FISHEYE", "1090,1090,1920,1920,0,0,0,0"),
              "x4_lens1": ("OPENCV_FISHEYE", "1090,1090,1920,1920,0,0,0,0"),
              "iphone": ("OPENCV", "2791,2791,2016,1512,0,0,0,0"),
              "gopro": ("OPENCV_FISHEYE", "1950,1950,2000,1500,0,0,0,0")}


def _solve_items(s3, b):
    import numpy as np
    xsel = json.loads(s3.get_object(Bucket=b, Key=f"{ROOT}/manifests/x4_selection.json")["Body"].read())
    ipp = json.loads(s3.get_object(Bucket=b, Key=f"{ROOT}/manifests/iphone_probe.json")["Body"].read())["photos"]
    gpp = json.loads(s3.get_object(Bucket=b, Key=f"{ROOT}/manifests/gopro_probe.json")["Body"].read())
    ip_hi = sorted([r["name"] for r in ipp if r["w"] == 4032], key=lambda n: int(n.rsplit("_", 1)[1].split(".")[0]))
    gmed = float(np.median([r["lapVarCentre"] for r in gpp]))
    gp_ok = sorted([r["name"] for r in gpp if r["lapVarCentre"] >= 0.5 * gmed and r["clipHi"] < 0.2])
    xs = [r for r in xsel["pairs"] if r["admitted"]]
    items = []   # (folder, filename, src_key, mask_key, time_s or None, x4_rank or None)
    for j, r in enumerate(xs):
        for L in (0, 1):
            fn = f"x4_f{r['frame']:05d}.png"
            items.append((f"x4_lens{L}", fn, f"{ROOT}/prepared/x4/lens{L}/{fn}", f"{ROOT}/masks_v2/x4_lens{L}/{fn}", r["t"], j))
    for n in ip_hi:
        idx = int(n.rsplit("_", 1)[1].split(".")[0])
        items.append(("iphone", n, f"{ROOT}/raw/iphone/{n}", f"{ROOT}/masks/iphone/{Path(n).stem}.png", 0.5 * idx + 9.0, None))
    for n in gp_ok:
        items.append(("gopro", n, f"{ROOT}/raw/gopro/{n}", f"{ROOT}/masks/gopro/{Path(n).stem}.png", None, None))
    return items


def _fetch_items(s3, b, W, items, with_masks=True):
    from concurrent.futures import ThreadPoolExecutor

    def fetch(it):
        folder, fn, k, mk = it[:4]
        (W / "images" / folder).mkdir(parents=True, exist_ok=True)
        (W / "masks" / folder).mkdir(parents=True, exist_ok=True)
        s3.download_file(b, k, str(W / "images" / folder / fn))
        if with_masks:
            try:
                s3.download_file(b, mk, str(W / "masks" / folder / (fn + ".png")))
            except Exception:  # noqa: BLE001 - no mask -> keep all
                pass
    with ThreadPoolExecutor(24) as ex:
        list(ex.map(fetch, items))


def _run(args, name, log):
    import time
    ts = time.time()
    r = subprocess.run([COLMAP] + args, capture_output=True, text=True)
    log[name] = {"s": round(time.time() - ts), "rc": r.returncode, "tail": (r.stdout + r.stderr)[-800:]}
    if r.returncode:
        raise RuntimeError(f"{name} failed: {(r.stdout + r.stderr)[-1500:]}")


@app.function(image=colmap_img, gpu="L4", cpu=8.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def camera_match(x4_loop_every: int = 8, gopro_x4_every: int = 3) -> dict:
    """GPU stage: per-camera SIFT (masks applied, physical priors) + pair matching. Pairs:
      base (X4 + iPhone, same walk) within +-12 s;  X4 loop closure = every x4_loop_every-th X4 frame, both lenses,
      exhaustive;  GoPro = next 8 GoPro stills + every gopro_x4_every-th X4 frame (both lenses) -- X4 is the anchor.
    No time is inferred for GoPro."""
    import time
    s3, b = _s3(), _bucket()
    W = Path("/tmp/sfm"); t0 = time.time(); log = {}
    items = _solve_items(s3, b)
    _fetch_items(s3, b, W, items)
    log["fetchS"] = round(time.time() - t0)
    db = str(W / "db.db")
    for folder, (model, params) in CAM_PRIORS.items():
        lst = W / f"list_{folder}.txt"
        lst.write_text("\n".join(f"{folder}/{it[1]}" for it in items if it[0] == folder))
        _run(["feature_extractor", "--database_path", db, "--image_path", str(W / "images"), "--image_list_path", str(lst),
              "--ImageReader.mask_path", str(W / "masks"), "--ImageReader.single_camera_per_folder", "1",
              "--ImageReader.camera_model", model, "--ImageReader.camera_params", params,
              "--SiftExtraction.use_gpu", "1",
              "--SiftExtraction.max_image_size", "3200", "--SiftExtraction.max_num_features", "8192"], f"extract_{folder}", log)
    nm = lambda it: f"{it[0]}/{it[1]}"
    base = sorted([it for it in items if it[0] != "gopro"], key=lambda it: it[4])
    gop = [it for it in items if it[0] == "gopro"]
    pairs = set()

    def add(p, q):
        if p != q:
            pairs.add(tuple(sorted((p, q))))
    for i, a in enumerate(base):
        for c in base[i + 1:]:
            if c[4] - a[4] > 12.0:
                break
            add(nm(a), nm(c))
    n_temporal = len(pairs)
    loop = [it for it in items if it[5] is not None and it[5] % x4_loop_every == 0]
    for i, a in enumerate(loop):
        for c in loop[i + 1:]:
            add(nm(a), nm(c))
    n_loop = len(pairs) - n_temporal
    anchors = [it for it in items if it[5] is not None and it[5] % gopro_x4_every == 0]
    for i, g in enumerate(gop):
        for c in gop[i + 1:i + 9]:
            add(nm(g), nm(c))
        for k in anchors:
            add(nm(g), nm(k))
    (W / "pairs.txt").write_text("\n".join(f"{p} {q}" for p, q in sorted(pairs)))
    log["pairs"] = {"total": len(pairs), "baseTemporal": n_temporal, "x4Loop": n_loop, "gopro": len(pairs) - n_temporal - n_loop}
    log["counts"] = {f: sum(1 for it in items if it[0] == f) for f in CAM_PRIORS}
    _run(["matches_importer", "--database_path", db, "--match_list_path", str(W / "pairs.txt"), "--match_type", "pairs",
          "--SiftMatching.use_gpu", "1"], "match", log)
    s3.upload_file(db, b, f"{SOLVE}/db.db")
    s3.upload_file(str(W / "pairs.txt"), b, f"{SOLVE}/pairs.txt")
    log["totalS"] = round(time.time() - t0)
    s3.put_object(Bucket=b, Key=f"{SOLVE}/match_log.json", Body=json.dumps(log, indent=1, default=str).encode())
    return {k: v for k, v in log.items() if not k.startswith("extract_")}


@app.function(image=colmap_img, cpu=16.0, memory=32768, timeout=4 * 3600, secrets=[secret])
def camera_map() -> dict:
    """CPU stage: incremental mapper on the base (X4 + iPhone) -> largest component; register GoPro into it
    (image_registrator, visual only); global BA. Writes sparse_base / sparse_all / sparse_ba + solve_log.json."""
    import time
    import numpy as np
    import pycolmap
    s3, b = _s3(), _bucket()
    W = Path("/tmp/sfm"); t0 = time.time(); log = {}
    items = _solve_items(s3, b)
    W.mkdir(parents=True, exist_ok=True)
    db = str(W / "db.db"); s3.download_file(b, f"{SOLVE}/db.db", db)
    nm = lambda it: f"{it[0]}/{it[1]}"
    (W / "base_list.txt").write_text("\n".join(nm(it) for it in items if it[0] != "gopro"))
    (W / "images").mkdir(exist_ok=True)
    for sub in ("sparse_base", "sparse_all", "sparse_ba"):
        (W / sub).mkdir(exist_ok=True)
    _run(["mapper", "--database_path", db, "--image_path", str(W / "images"), "--output_path", str(W / "sparse_base"),
          "--image_list_path", str(W / "base_list.txt"), "--Mapper.num_threads", "16"], "map_base", log)
    comps = sorted((p for p in (W / "sparse_base").iterdir() if p.is_dir()),
                   key=lambda p: -pycolmap.Reconstruction(str(p)).num_reg_images())
    best = comps[0]
    log["baseComponents"] = [(p.name, pycolmap.Reconstruction(str(p)).num_reg_images()) for p in comps]
    _run(["image_registrator", "--database_path", db, "--input_path", str(best), "--output_path", str(W / "sparse_all"),
          "--Mapper.num_threads", "16"], "register_gopro", log)
    _run(["bundle_adjuster", "--input_path", str(W / "sparse_all"), "--output_path", str(W / "sparse_ba")], "bundle_adjust", log)
    r = pycolmap.Reconstruction(str(W / "sparse_ba"))
    per = {}
    for iid, im in r.images.items():
        per.setdefault(im.name.split("/")[0], []).append(im)
    log["registeredBySource"] = {f: {"registered": len(ims), "total": sum(1 for it in items if it[0] == f),
                                     "medianPoints3D": float(np.median([im.num_points3D for im in ims]))} for f, ims in per.items()}
    log["meanReprojErrorPx"] = float(r.compute_mean_reprojection_error())
    log["points3D"] = r.num_points3D()
    log["cameras"] = {str(cid): {"model": c.model.name, "w": c.width, "h": c.height, "params": [round(float(x), 5) for x in c.params]}
                      for cid, c in r.cameras.items()}
    for sub in ("sparse_base", "sparse_all", "sparse_ba"):
        for p in (W / sub).rglob("*"):
            if p.is_file():
                s3.upload_file(str(p), b, f"{SOLVE}/{p.relative_to(W).as_posix()}")
    log["totalS"] = round(time.time() - t0)
    s3.put_object(Bucket=b, Key=f"{SOLVE}/solve_log.json", Body=json.dumps(log, indent=1, default=str).encode())
    out = {k: v for k, v in log.items() if k != "map_base"}
    out["map_base_s"] = log["map_base"]["s"]
    return out


@app.function(image=img, cpu=16.0, memory=65536, timeout=2 * 3600, secrets=[secret])
def refine_x4_masks(freq_thr: float = 0.05, cap_frac: float = 0.82, spots_on: bool = False) -> dict:
    """v1 per-frame masks miss parts of the operator (head/shoulder at the fisheye edge) and the stick, because the X4
    was held sideways and the operator sits in the bottom of BOTH lenses. v2 adds, per lens:
      a static operator zone = pixels masked in >= freq_thr of v1 frames (dilated) + everything below cap_frac*H
      lens spots = dark blobs in the temporal median (median - blur < -6 luma), dilated
    Writes masks_v2/x4_lens{0,1}/ (v1 untouched) and sheets masks_v2/_sheets/."""
    import cv2
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    out = {}
    for L in (0, 1):
        g = f"x4_lens{L}"
        mkeys = _list(s3, b, f"{ROOT}/masks/{g}/", exts=(".png",))
        def getm(k):
            a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
            return cv2.imdecode(a, cv2.IMREAD_GRAYSCALE)
        with ThreadPoolExecutor(32) as ex:
            ms = list(ex.map(getm, mkeys))
        H, W = ms[0].shape
        stack = np.stack([cv2.resize(m, (W // 4, H // 4), interpolation=cv2.INTER_NEAREST) == 0 for m in ms])
        circ_out = stack.mean(0) > 0.99                       # outside image circle (always masked)
        freq = stack.mean(0)
        zone = ((freq >= freq_thr) & ~circ_out).astype(np.uint8)
        zone = cv2.dilate(zone, np.ones((15, 15), np.uint8))  # 60 px at full res
        yy = np.arange(H // 4)[:, None] * np.ones((1, W // 4))
        zone |= (yy > cap_frac * (H // 4)).astype(np.uint8)
        # lens spots from the temporal median of ~100 frames
        ikeys = _list(s3, b, f"{ROOT}/prepared/x4/lens{L}/")[::3]
        def geti(k):
            a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
            im = cv2.imdecode(a, cv2.IMREAD_GRAYSCALE)
            return cv2.resize(im, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        with ThreadPoolExecutor(16) as ex:
            ims = list(ex.map(geti, ikeys))
        med = np.median(np.stack(ims).astype(np.float32), 0)
        hp = med - cv2.GaussianBlur(med, (0, 0), 6)
        spots = ((hp < -6) & ~circ_out & (zone == 0)).astype(np.uint8)
        spots = cv2.morphologyEx(spots, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        n_spots, _ = cv2.connectedComponents(spots)
        if not spots_on:   # v2a sheet: detector fired on the mean horizon edge, not lens dirt -> disabled
            spots[:] = 0; n_spots = 1
        spots = cv2.dilate(spots, np.ones((5, 5), np.uint8))
        static = cv2.resize(((zone > 0) | (spots > 0)).astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST)
        frac = []; sheet = []
        for i, (k, m) in enumerate(zip(mkeys, ms)):
            keep = ((m > 0) & (static == 0)).astype(np.uint8) * 255
            frac.append(float((keep > 0).mean()))
            ok, png = cv2.imencode(".png", keep)
            s3.put_object(Bucket=b, Key=k.replace("/masks/", "/masks_v2/"), Body=png.tobytes())
            if i % max(1, len(mkeys) // 12) == 0 and len(sheet) < 12:
                a = np.frombuffer(s3.get_object(Bucket=b, Key=f"{ROOT}/prepared/x4/lens{L}/{Path(k).name}")["Body"].read(), np.uint8)
                bgr = cv2.imdecode(a, cv2.IMREAD_COLOR)
                ov = bgr.copy(); ov[keep == 0] = (0.4 * ov[keep == 0] + [0, 0, 150]).astype(np.uint8)
                sheet.append(cv2.resize(ov, (480, 480)))
        rows = [np.hstack(sheet[j:j + 4]) for j in range(0, 12, 4)]
        ok, jpg = cv2.imencode(".jpg", np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
        s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v2/_sheets/{g}.jpg", Body=jpg.tobytes())
        out[g] = {"frames": len(ms), "staticZoneFrac": round(float(zone.mean()), 4), "lensSpots": int(n_spots - 1),
                  "keepFractionMedian": round(float(np.median(frac)), 4), "keepFractionMin": round(float(np.min(frac)), 4)}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/masks_v2_summary.json", Body=json.dumps(out, indent=1).encode())
    return out


@app.function(image=colmap_img, cpu=2.0, timeout=600)
def colmap_help(cmd: str) -> str:
    r = subprocess.run([COLMAP, cmd, "-h"], capture_output=True, text=True)
    return r.stdout + r.stderr


def _robust_download(s3, b, key, dest, part=32 * 2**20, workers=16):
    """Ranged parallel GET with per-part retries (boto download_file gave RetriesExceeded on the 3.7 GiB db)."""
    import time
    from concurrent.futures import ThreadPoolExecutor
    size = s3.head_object(Bucket=b, Key=key)["ContentLength"]
    with open(dest, "wb") as f:
        f.truncate(size)

    def get(off):
        rng = f"bytes={off}-{min(off + part, size) - 1}"
        for att in range(12):
            try:
                data = s3.get_object(Bucket=b, Key=key, Range=rng)["Body"].read()
                if len(data) != min(part, size - off):
                    raise IOError("short read")
                with open(dest, "r+b") as f:
                    f.seek(off); f.write(data)
                return
            except Exception:  # noqa: BLE001 - retry this part
                time.sleep(min(60, 2 ** att))
        raise RuntimeError(f"part {off} failed")
    with ThreadPoolExecutor(workers) as ex:
        list(ex.map(get, range(0, size, part)))
    return size


def _run_logged(args, name, log, s3, b, prefix, timeout_s, snap_dir=None):
    """Run COLMAP with the log streamed to R2 every 5 min (plus the newest snapshot model) so a timeout keeps evidence."""
    import threading
    import time
    ts = time.time()
    lp = Path(f"/tmp/{name}.log")
    with open(lp, "w") as fh:
        p = subprocess.Popen([COLMAP] + args, stdout=fh, stderr=subprocess.STDOUT, text=True)
        stop = threading.Event()

        def pusher():
            while not stop.wait(300):
                try:
                    s3.put_object(Bucket=b, Key=f"{prefix}/progress/{name}.log.tail", Body=lp.read_bytes()[-20000:])
                    if snap_dir and Path(snap_dir).exists():
                        snaps = sorted(Path(snap_dir).iterdir(), key=lambda q: q.stat().st_mtime)
                        if snaps:
                            for f in snaps[-1].rglob("*"):
                                if f.is_file():
                                    s3.upload_file(str(f), b, f"{prefix}/progress/{name}_snapshot/{f.name}")
                except Exception:  # noqa: BLE001 - progress upload is best-effort
                    pass
        th = threading.Thread(target=pusher, daemon=True); th.start()
        try:
            rc = p.wait(timeout=timeout_s)
        except subprocess.TimeoutExpired:
            p.kill(); rc = -9
        stop.set()
    tail = lp.read_text(errors="replace")[-1500:]
    s3.put_object(Bucket=b, Key=f"{prefix}/progress/{name}.log.tail", Body=lp.read_bytes()[-20000:])
    log[name] = {"s": round(time.time() - ts), "rc": rc, "tail": tail[-800:]}
    return rc


@app.function(image=colmap_img, cpu=16.0, memory=32768, timeout=3 * 3600, secrets=[secret])
def camera_map_v2(map_timeout_s: int = 7200) -> dict:
    """v2 after v1 hit its 4 h timeout (1353-image incremental base, default BA, no checkpoints):
      1 X4 lens0/lens1 configured as a RIG (frames = same frame number; lens1 = lens0 rotated 180 deg about image-up,
        small offset; sensor_from_rig refined) -> 311 frames to solve
      2 incremental mapper on X4 only, cheaper BA schedule, snapshots + log streamed to R2, hard wall-clock cap
      3 image_registrator adds iPhone + GoPro (visual), 4 bundle_adjuster (capped). Outputs camera-solves/v2/."""
    import time
    import numpy as np
    import pycolmap
    s3, b = _s3(), _bucket()
    OUTP = f"{ROOT}/camera-solves/v2"
    W = Path("/tmp/sfm"); t0 = time.time(); log = {}
    items = _solve_items(s3, b)
    W.mkdir(parents=True, exist_ok=True)
    db = str(W / "db.db"); log["dbBytes"] = _robust_download(s3, b, f"{SOLVE}/db.db", db)
    log["dbFetchS"] = round(time.time() - t0)
    rig = [{"cameras": [
        {"image_prefix": "x4_lens0/", "ref_sensor": True},
        {"image_prefix": "x4_lens1/", "cam_from_rig_rotation": [0.0, 0.0, 1.0, 0.0],
         "cam_from_rig_translation": [0.0, 0.0, -0.03]}]},
           {"cameras": [{"image_prefix": "iphone/", "ref_sensor": True}]},
           {"cameras": [{"image_prefix": "gopro/", "ref_sensor": True}]}]
    (W / "rig.json").write_text(json.dumps(rig))
    rc = _run_logged(["rig_configurator", "--database_path", db, "--rig_config_path", str(W / "rig.json")],
                     "rig", log, s3, b, OUTP, 1800)
    if rc:
        raise RuntimeError(f"rig_configurator failed: {log['rig']['tail']}")
    nm = lambda it: f"{it[0]}/{it[1]}"
    (W / "x4_list.txt").write_text("\n".join(nm(it) for it in items if it[0].startswith("x4_")))
    for sub in ("sparse_x4", "sparse_all", "sparse_ba", "snap"):
        (W / sub).mkdir(exist_ok=True)
    (W / "images").mkdir(exist_ok=True)
    rc = _run_logged(["mapper", "--database_path", db, "--image_path", str(W / "images"), "--output_path", str(W / "sparse_x4"),
                      "--image_list_path", str(W / "x4_list.txt"), "--Mapper.num_threads", "16",
                      "--Mapper.max_num_models", "5", "--Mapper.init_num_trials", "60",
                      "--Mapper.ba_global_frames_ratio", "1.4", "--Mapper.ba_global_points_ratio", "1.4",
                      "--Mapper.ba_global_max_num_iterations", "30", "--Mapper.ba_local_max_num_iterations", "20",
                      "--Mapper.snapshot_path", str(W / "snap"), "--Mapper.snapshot_frames_freq", "40"],
                     "map_x4", log, s3, b, OUTP, map_timeout_s, snap_dir=W / "snap")
    comps = [p for p in (W / "sparse_x4").iterdir() if p.is_dir()]
    if not comps:
        s3.put_object(Bucket=b, Key=f"{OUTP}/solve_log.json", Body=json.dumps(log, indent=1, default=str).encode())
        return {"stage": "map_x4", "rc": rc, "tail": log["map_x4"]["tail"], "totalS": round(time.time() - t0)}
    comps.sort(key=lambda p: -pycolmap.Reconstruction(str(p)).num_reg_images())
    best = comps[0]
    log["x4Components"] = [(p.name, pycolmap.Reconstruction(str(p)).num_reg_images()) for p in comps]
    for f in best.rglob("*"):
        if f.is_file():
            s3.upload_file(str(f), b, f"{OUTP}/sparse_x4/{f.name}")
    rc = _run_logged(["image_registrator", "--database_path", db, "--input_path", str(best), "--output_path", str(W / "sparse_all"),
                      "--Mapper.num_threads", "16"], "register_rest", log, s3, b, OUTP, 3600)
    final = W / "sparse_all" if rc == 0 else best
    if rc == 0:
        rc2 = _run_logged(["bundle_adjuster", "--input_path", str(W / "sparse_all"), "--output_path", str(W / "sparse_ba"),
                           "--BundleAdjustment.max_num_iterations", "40"], "bundle_adjust", log, s3, b, OUTP, 2400)
        if rc2 == 0:
            final = W / "sparse_ba"
    r = pycolmap.Reconstruction(str(final))
    per = {}
    for iid, im in r.images.items():
        per.setdefault(im.name.split("/")[0], []).append(im)
    log["final"] = final.name
    log["registeredBySource"] = {f: {"registered": len(ims), "total": sum(1 for it in items if it[0] == f),
                                     "medianPoints3D": float(np.median([im.num_points3D for im in ims]))} for f, ims in per.items()}
    log["meanReprojErrorPx"] = float(r.compute_mean_reprojection_error())
    log["points3D"] = r.num_points3D()
    log["cameras"] = {str(cid): {"model": c.model.name, "w": c.width, "h": c.height, "params": [round(float(x), 5) for x in c.params]}
                      for cid, c in r.cameras.items()}
    for sub in ("sparse_all", "sparse_ba"):
        for p in (W / sub).rglob("*"):
            if p.is_file():
                s3.upload_file(str(p), b, f"{OUTP}/{p.relative_to(W).as_posix()}")
    log["totalS"] = round(time.time() - t0)
    s3.put_object(Bucket=b, Key=f"{OUTP}/solve_log.json", Body=json.dumps(log, indent=1, default=str).encode())
    return {k: (v if not isinstance(v, dict) or "tail" not in v else {"s": v["s"], "rc": v["rc"]}) for k, v in log.items()}


@app.function(image=img, cpu=16.0, memory=65536, timeout=2 * 3600, secrets=[secret])
def droplet_masks(ratio_thr: float = 0.55, min_area_px: int = 1500) -> dict:
    """Lens droplets = image-fixed soft-blur blobs. Per lens: temporal MEAN of local high-frequency energy
    (|Laplacian|, blurred) over all admitted frames at 1/4 scale; a droplet is where that mean is persistently low
    relative to its surroundings (ratio to a wide blur < ratio_thr), inside the image circle and outside the operator
    zone, blob area >= min_area_px (full-res). Lens0 is the control (visually clean). Writes masks_v3/ (= v2 minus
    droplets) + sheets + the ratio maps."""
    import cv2
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    out = {}
    for L in (0, 1):
        g = f"x4_lens{L}"
        ikeys = _list(s3, b, f"{ROOT}/prepared/x4/lens{L}/")

        def hf(k):
            a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
            im = cv2.imdecode(a, cv2.IMREAD_GRAYSCALE)
            sm = cv2.resize(im, (960, 960), interpolation=cv2.INTER_AREA).astype(np.float32)
            return cv2.GaussianBlur(np.abs(cv2.Laplacian(sm, cv2.CV_32F, ksize=3)), (0, 0), 3)
        acc = np.zeros((960, 960), np.float64); n = 0
        with ThreadPoolExecutor(16) as ex:
            for e in ex.map(hf, ikeys):
                acc += e; n += 1
        mean = (acc / n).astype(np.float32)
        m2 = np.frombuffer(s3.get_object(Bucket=b, Key=f"{ROOT}/masks_v2/{g}/{Path(ikeys[0]).name}")["Body"].read(), np.uint8)
        keep2 = cv2.resize(cv2.imdecode(m2, cv2.IMREAD_GRAYSCALE), (960, 960), interpolation=cv2.INTER_NEAREST) > 0
        valid = keep2.astype(np.float32)
        wide = cv2.GaussianBlur(mean * valid, (0, 0), 40) / np.maximum(cv2.GaussianBlur(valid, (0, 0), 40), 1e-3)
        ratio = mean / np.maximum(wide, 1e-3)
        cand = ((ratio < ratio_thr) & keep2).astype(np.uint8)
        cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        nlab, lab, st, _ = cv2.connectedComponentsWithStats(cand)
        blobs = np.zeros_like(cand)
        kept = []
        for i in range(1, nlab):
            area_full = st[i, cv2.CC_STAT_AREA] * 16
            if area_full >= min_area_px:
                blobs[lab == i] = 1
                kept.append({"x": int(st[i, 0] * 4), "y": int(st[i, 1] * 4), "w": int(st[i, 2] * 4), "h": int(st[i, 3] * 4),
                             "areaPx": int(area_full)})
        blobs = cv2.dilate(blobs, np.ones((9, 9), np.uint8))
        full = cv2.resize(blobs, (3840, 3840), interpolation=cv2.INTER_NEAREST)
        vis = cv2.applyColorMap(np.clip(ratio * 128, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
        vis[blobs > 0] = (255, 255, 255)
        ok, jpg = cv2.imencode(".jpg", vis, [cv2.IMWRITE_JPEG_QUALITY, 85])
        s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/_sheets/{g}_hf_ratio.jpg", Body=jpg.tobytes())
        mkeys = _list(s3, b, f"{ROOT}/masks_v2/{g}/", exts=(".png",))

        def wr(k):
            a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
            m = cv2.imdecode(a, cv2.IMREAD_GRAYSCALE)
            keep = ((m > 0) & (full == 0)).astype(np.uint8) * 255
            ok, png = cv2.imencode(".png", keep)
            s3.put_object(Bucket=b, Key=k.replace("/masks_v2/", "/masks_v3/"), Body=png.tobytes())
            return float((keep > 0).mean())
        with ThreadPoolExecutor(32) as ex:
            fr = list(ex.map(wr, mkeys))
        # sample overlay
        a = np.frombuffer(s3.get_object(Bucket=b, Key=ikeys[len(ikeys) // 2])["Body"].read(), np.uint8)
        bgr = cv2.resize(cv2.imdecode(a, cv2.IMREAD_COLOR), (1280, 1280))
        bl = cv2.resize(blobs, (1280, 1280), interpolation=cv2.INTER_NEAREST) > 0
        bgr[bl] = (0.5 * bgr[bl] + [0, 0, 120]).astype(np.uint8)
        ok, jpg = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
        s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/_sheets/{g}_droplets.jpg", Body=jpg.tobytes())
        out[g] = {"frames": n, "blobs": len(kept), "blobAreaFrac": round(float(full.mean()), 4), "blobList": kept[:40],
                  "keepFractionMedian": round(float(np.median(fr)), 4)}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/droplets_summary.json", Body=json.dumps(out, indent=1).encode())
    return out


@app.function(image=gpu_img, gpu="T4", cpu=8.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def gopro_object_masks() -> dict:
    """Movable furniture changed between session 1 (X4 + iPhone) and session 2 (GoPro): the X4 walk is the scene of
    record, so COCO movable objects (bench, umbrella, sports ball, chair, couch, dining table, potted-plant NOT
    included) are removed from GoPro keep-masks only. masks_v3/gopro = masks/gopro minus objects (dilated)."""
    import cv2
    import numpy as np
    import torch
    import torchvision
    from concurrent.futures import ThreadPoolExecutor
    s3, b = _s3(), _bucket()
    MOV = {15: "bench", 28: "umbrella", 37: "sports ball", 62: "chair", 63: "couch", 67: "dining table"}
    keys = _list(s3, b, f"{ROOT}/raw/gopro/")
    model = torchvision.models.detection.maskrcnn_resnet50_fpn_v2(weights="DEFAULT").eval().cuda()

    def dl(k):
        a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
        m = np.frombuffer(s3.get_object(Bucket=b, Key=f"{ROOT}/masks/gopro/{Path(k).stem}.png")["Body"].read(), np.uint8)
        return k, cv2.imdecode(a, cv2.IMREAD_COLOR), cv2.imdecode(m, cv2.IMREAD_GRAYSCALE)
    counts = {v: 0 for v in MOV.values()}; frac = []; sheet = []; n_hit = 0
    with ThreadPoolExecutor(8) as ex:
        for i, (k, bgr, m) in enumerate(ex.map(dl, keys)):
            H, W = bgr.shape[:2]; sc = 1333.0 / max(H, W)
            small = cv2.resize(bgr, (int(W * sc), int(H * sc)), interpolation=cv2.INTER_AREA)
            t = torch.from_numpy(small[..., ::-1].copy()).permute(2, 0, 1).float().div(255).cuda()
            with torch.no_grad():
                o = model([t])[0]
            pm = np.zeros(small.shape[:2], bool)
            for lab, sco, mk in zip(o["labels"].tolist(), o["scores"].tolist(), o["masks"]):
                if lab in MOV and sco >= 0.5:
                    pm |= mk[0].cpu().numpy() > 0.5; counts[MOV[lab]] += 1
            obj = cv2.resize(pm.astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST)
            if obj.any():
                n_hit += 1; obj = cv2.dilate(obj, np.ones((41, 41), np.uint8))
            keep = ((m > 0) & (obj == 0)).astype(np.uint8) * 255
            frac.append(float((keep > 0).mean()))
            ok, png = cv2.imencode(".png", keep)
            s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/gopro/{Path(k).stem}.png", Body=png.tobytes())
            if obj.any() and len(sheet) < 12 and i % 5 == 0:
                ov = bgr.copy(); ov[keep == 0] = (0.4 * ov[keep == 0] + [0, 0, 150]).astype(np.uint8)
                sheet.append(cv2.resize(ov, (480, 360)))
    while len(sheet) % 4:
        sheet.append(np.zeros((360, 480, 3), np.uint8))
    if sheet:
        ok, jpg = cv2.imencode(".jpg", np.vstack([np.hstack(sheet[j:j + 4]) for j in range(0, len(sheet), 4)]),
                               [cv2.IMWRITE_JPEG_QUALITY, 85])
        s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/_sheets/gopro_objects.jpg", Body=jpg.tobytes())
    out = {"images": len(keys), "withObjects": n_hit, "detections": counts,
           "keepFractionMedian": round(float(np.median(frac)), 4), "keepFractionMin": round(float(np.min(frac)), 4)}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/gopro_objects_summary.json", Body=json.dumps(out, indent=1).encode())
    return out


seg_img = gpu_img.pip_install("transformers==4.46.3").run_commands(
    "python -c \"from transformers import SegformerForSemanticSegmentation as S, SegformerImageProcessor as P;"
    " S.from_pretrained('nvidia/segformer-b4-finetuned-ade-512-512'); P.from_pretrained('nvidia/segformer-b4-finetuned-ade-512-512')\"")


@app.function(image=seg_img, gpu="T4", cpu=8.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def gopro_sky_masks() -> dict:
    """Sky differs completely between session 1 and session 2, so session-2 (GoPro) sky is removed: SegFormer-B4
    (ADE20K, class 2 = sky) at 1024 px, sky dilated 15 px, combined into masks_v3/gopro (objects already removed).
    X4 / iPhone keep their own sky (same session)."""
    import cv2
    import numpy as np
    import torch
    from concurrent.futures import ThreadPoolExecutor
    from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
    s3, b = _s3(), _bucket()
    name = "nvidia/segformer-b4-finetuned-ade-512-512"
    proc = SegformerImageProcessor.from_pretrained(name)
    model = SegformerForSemanticSegmentation.from_pretrained(name).eval().cuda()
    keys = _list(s3, b, f"{ROOT}/raw/gopro/")

    def dl(k):
        a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
        m = np.frombuffer(s3.get_object(Bucket=b, Key=f"{ROOT}/masks_v3/gopro/{Path(k).stem}.png")["Body"].read(), np.uint8)
        return k, cv2.imdecode(a, cv2.IMREAD_COLOR), cv2.imdecode(m, cv2.IMREAD_GRAYSCALE)
    fr = []; skyf = []; sheet = []
    with ThreadPoolExecutor(8) as ex:
        for i, (k, bgr, m) in enumerate(ex.map(dl, keys)):
            H, W = bgr.shape[:2]
            small = cv2.resize(bgr, (1024, 768), interpolation=cv2.INTER_AREA)[..., ::-1]
            inp = proc(images=small, return_tensors="pt", do_resize=False).to("cuda")
            with torch.no_grad():
                lg = model(**inp).logits
            lg = torch.nn.functional.interpolate(lg, size=(768, 1024), mode="bilinear", align_corners=False)
            sky = (lg.argmax(1)[0] == 2).cpu().numpy().astype(np.uint8)
            sky = cv2.resize(sky, (W, H), interpolation=cv2.INTER_NEAREST)
            sky = cv2.dilate(sky, np.ones((31, 31), np.uint8))
            keep = ((m > 0) & (sky == 0)).astype(np.uint8) * 255
            skyf.append(float(sky.mean())); fr.append(float((keep > 0).mean()))
            ok, png = cv2.imencode(".png", keep)
            s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/gopro/{Path(k).stem}.png", Body=png.tobytes())
            if i % (len(keys) // 12) == 0 and len(sheet) < 12:
                ov = bgr.copy(); ov[keep == 0] = (0.4 * ov[keep == 0] + [0, 0, 150]).astype(np.uint8)
                sheet.append(cv2.resize(ov, (480, 360)))
    ok, jpg = cv2.imencode(".jpg", np.vstack([np.hstack(sheet[j:j + 4]) for j in range(0, 12, 4)]), [cv2.IMWRITE_JPEG_QUALITY, 85])
    s3.put_object(Bucket=b, Key=f"{ROOT}/masks_v3/_sheets/gopro_sky.jpg", Body=jpg.tobytes())
    out = {"images": len(keys), "skyFracMedian": round(float(np.median(skyf)), 4),
           "keepFractionMedian": round(float(np.median(fr)), 4), "keepFractionMin": round(float(np.min(fr)), 4)}
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/gopro_sky_summary.json", Body=json.dumps(out, indent=1).encode())
    return out


SX_DIR = str(Path(__file__).resolve().parent.parent / "spirula-experimental")
zone_img = (colmap_img.add_local_dir(SX_DIR, "/opt/sx", ignore=["__pycache__"])
            .add_local_python_source("zoneds"))
SPIRULA_ROOT = "experimental/spirula-hardened"
GOLDEN_FLAGS_KEY = f"{SPIRULA_ROOT}/jobs/room213-ppisp-v1.json"


@app.function(image=zone_img, cpu=16.0, memory=65536, timeout=3 * 3600, secrets=[secret])
def build_zone_datasets(zc: dict, box: list, init_radius_m: float = 14.0, tag: str = "v1") -> dict:
    """Frozen A / D datasets for the compact zone (see zoneds.py). Writes the frozen split + colour fit + selection to
    backyard manifests/zone_<tag>.json, packages both datasets into the hardened worker's content-addressed store and
    writes PENDING prep jobs (config probe next)."""
    import sys
    import time
    import cv2
    import numpy as np
    import pycolmap
    from concurrent.futures import ThreadPoolExecutor
    sys.path.insert(0, "/opt/sx")
    import zoneds as Z
    from dspackage import dataset_manifest, put_json, upload_objects
    from jobspec import canonical_sha
    t0 = time.time()
    s3, b = _s3(), _bucket()
    sol = Path("/tmp/sol"); sol.mkdir(exist_ok=True)
    for f in ("cameras.bin", "frames.bin", "images.bin", "points3D.bin", "rigs.bin"):
        _robust_download(s3, b, f"{ROOT}/camera-solves/v2/sparse_ba/{f}", str(sol / f))
    rec = pycolmap.Reconstruction(str(sol))
    mu, Vt, S = Z.zone_frame(zc)
    zone, chosen, nobs = Z.select(rec, mu, Vt, S, box)
    split = Z.split_of(chosen)
    by_name = {im.name: im for im in rec.images.values()}

    def src_key(n):
        f = n.split("/")[1]
        if n.startswith("x4_"):
            return f"{ROOT}/prepared/x4/{n.split('/')[0].replace('x4_', '')}/{f}", f"{ROOT}/masks_v3/{n.split('/')[0]}/{f}"
        if n.startswith("gopro/"):
            return f"{ROOT}/raw/gopro/{f}", f"{ROOT}/masks_v3/gopro/{Path(f).stem}.png"
        return f"{ROOT}/raw/iphone/{f}", f"{ROOT}/masks/iphone/{Path(f).stem}.png"

    def load(n):
        k, mk = src_key(n)
        a = np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8)
        img = cv2.imdecode(a, cv2.IMREAD_COLOR)[..., ::-1]                      # RGB
        m = cv2.imdecode(np.frombuffer(s3.get_object(Bucket=b, Key=mk)["Body"].read(), np.uint8), cv2.IMREAD_GRAYSCALE)
        return n, img, m
    # init points (identical for A and D): solve points within init_radius_m (ground plane) of the zone centre
    cu, cv_ = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
    init_ids = [pid for pid, p in rec.points3D.items()
                if np.hypot(*(((p.xyz - mu) @ Vt.T) * S)[:2] - np.array([cu, cv_])) <= init_radius_m]
    init_set = set(init_ids)
    # pass 1: samples (X4 colours for every init point; per-source colours at zone points for the colour fit)
    x4col = {}; srccol = {"gopro": {}, "iphone": {}}; x4zone = {}
    names = sorted(chosen)
    with ThreadPoolExecutor(8) as ex:
        for n, img, m in ex.map(load, names):
            im = by_name[n]; s = Z.src_of(n)
            sat = cv2.dilate((img.max(2) >= Z.SAT).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
            for p in im.points2D:
                if not p.has_point3D():
                    continue
                pid = p.point3D_id
                x, y = int(round(p.xy[0])), int(round(p.xy[1]))
                if not (0 <= y < m.shape[0] and 0 <= x < m.shape[1]) or m[y, x] == 0 or sat[y, x]:
                    continue
                c = Z.patch_mean(img, p.xy)
                if c is None:
                    continue
                if s == "x4":
                    if pid in init_set:
                        x4col.setdefault(pid, []).append(c)
                    if pid in zone:
                        x4zone.setdefault(pid, []).append(c)
                elif pid in zone:
                    srccol[s].setdefault(pid, []).append(c)
    fits = {}
    for s in ("gopro", "iphone"):
        common = [pid for pid in srccol[s] if pid in x4zone]
        A, st = Z.fit_affine(np.array([np.median(srccol[s][p], 0) for p in common]),
                             np.array([np.median(x4zone[p], 0) for p in common]))
        fits[s] = {"A": A.tolist(), **st}
    init_pts = [(rec.points3D[pid].xyz.tolist(), np.median(x4col[pid], 0) if pid in x4col else np.array([128, 128, 128]))
                for pid in init_ids]
    # pass 2: write dataset tree once (D = superset); A is a filtered copy of the same files
    root = Path("/tmp/dsD"); (root / "images").mkdir(parents=True, exist_ok=True)
    out_name = {}
    for n in names:
        folder, f = n.split("/")
        out_name[n] = f"{folder}/{Path(f).stem}_{split[n]}.png"

    def write(args):
        n, img, m = args
        s = Z.src_of(n)
        if s != "x4":
            sat = cv2.dilate((img.max(2) >= Z.SAT).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
            A = np.array(fits[s]["A"])
            flat = img.reshape(-1, 3).astype(np.float32)
            img = np.clip(np.hstack([flat, np.ones((len(flat), 1), np.float32)]) @ A, 0, 255).round().astype(np.uint8).reshape(img.shape)
            m = ((m > 0) & ~sat).astype(np.uint8) * 255
        dst = root / "images" / out_name[n]; dst.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(dst), img[..., ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 3])
        md = root / "masks" / out_name[n]; md.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(md), m)
        return n
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(write, ex.map(load, names)))
    cams = {by_name[n].camera_id for n in names}
    Z.write_sparse(root, rec, out_name, cams, init_pts)
    lens_cam = {f: by_name[next(n for n in names if n.startswith(f + "/"))].camera_id for f in ("x4_lens0", "x4_lens1")}
    # dataset A = X4 train + the SAME eval set (all sources)
    rootA = Path("/tmp/dsA")
    keepA = {n for n in names if n.startswith("x4_") or split[n] == "eval"}
    for n in keepA:
        for sub in ("images", "masks"):
            d = rootA / sub / out_name[n]; d.parent.mkdir(parents=True, exist_ok=True)
            d.hardlink_to(root / sub / out_name[n])
    Z.write_sparse(rootA, rec, {n: out_name[n] for n in keepA}, cams, init_pts)
    frozen = {"zoneBoxMetres": box, "zoneFrame": zc, "initRadiusM": init_radius_m, "initPoints": len(init_pts),
              "zonePoints": len(zone), "minZoneObs": Z.MIN_ZONE_OBS, "satThreshold": Z.SAT,
              "selected": {s: {"train": sum(1 for n in names if Z.src_of(n) == s and split[n] == "train"),
                               "eval": sum(1 for n in names if Z.src_of(n) == s and split[n] == "eval")}
                           for s in ("x4", "gopro", "iphone")},
              "split": {out_name[n]: split[n] for n in names}, "colourFit": fits, "solve": f"{ROOT}/camera-solves/v2/sparse_ba",
              "masks": {"x4": "masks_v3 (operator zone + droplets)", "gopro": "masks_v3 (person, movable objects, sky) minus clipped",
                        "iphone": "masks (person) minus clipped"}}
    raw = json.dumps(frozen, indent=1, sort_keys=True).encode()
    import hashlib
    frozen_sha = hashlib.sha256(raw).hexdigest()
    s3.put_object(Bucket=b, Key=f"{ROOT}/manifests/zone_{tag}.json", Body=raw)
    golden = json.loads(s3.get_object(Bucket=b, Key=GOLDEN_FLAGS_KEY)["Body"].read())
    res = {"frozenKey": f"{ROOT}/manifests/zone_{tag}.json", "frozenSha256": frozen_sha,
           "selected": frozen["selected"], "colourFit": {s: {k: v for k, v in f.items() if k != "A"} for s, f in fits.items()},
           "initPoints": len(init_pts), "zonePoints": len(zone)}
    for label, rt in (("A", rootA), ("D", root)):
        did = f"backyard-zone-{tag}-{label}"
        man = dataset_manifest(rt, dataset_id=did, lens_folders=lens_cam,
                               lens_of_camera={str(lens_cam["x4_lens0"]): "x4-lens-stream-0", str(lens_cam["x4_lens1"]): "x4-lens-stream-1"},
                               split_rule="filename", role_of={},
                               extra={"sourceSolve": frozen["solve"], "frozenZoneKey": res["frozenKey"], "frozenZoneSha256": frozen_sha})
        pre = f"{SPIRULA_ROOT}/datasets/{did}"
        up = upload_objects(s3, b, f"{pre}/objects", rt, man["files"])
        man_sha = put_json(s3, b, f"{pre}/dataset_manifest.json", man)
        flags = [list(f) for f in golden["flags"]]
        job = {"schema": "spirula-job-v1", "runId": f"backyard-zone-{tag}-{label}", "spirulaSha": golden["spirulaSha"],
               "binarySha256": golden["binarySha256"], "backend": "cuda", "gpu": golden["gpu"], "preset": golden["preset"],
               "flags": flags, "expectedResolvedConfigSha256": "PENDING",
               "dataset": {"manifestKey": f"{pre}/dataset_manifest.json", "manifestSha256": man_sha,
                           "datasetSha256": canonical_sha(man["files"]), "objectsPrefix": f"{pre}/objects"},
               "terminalStep": 30000, "shDegree": 3, "countMin": 900000, "countMax": 1000000, "evalExpected": True,
               "expectedMinutes": 1, "requiredArtifactTypes": ["master-ply", "terminal-state", "resolved-config", "train-log",
                                                               "attempt-record", "fidelity-report", "eval-metrics"],
               "notes": f"Backyard fusion {label}: Room 213 PPISP recipe (1M/30k, native fisheye, PPISP no_crf_no_vig), "
                        f"frozen zone {res['frozenKey']} sha {frozen_sha[:12]}; A/D share eval set and points3D."}
        jraw = json.dumps(job, indent=1, sort_keys=True).encode()
        jkey = f"{SPIRULA_ROOT}/jobs/backyard-zone-{tag}-{label}-prep.json"
        s3.put_object(Bucket=b, Key=jkey, Body=jraw, ContentType="application/json")
        res[label] = {"datasetId": did, "images": len(man["images"]), "files": len(man["files"]), "upload": up,
                      "prepJobKey": jkey, "prepJobSha256": hashlib.sha256(jraw).hexdigest(),
                      "bytes": sum(f["bytes"] for f in man["files"])}
    res["totalS"] = round(time.time() - t0)
    return res


@app.function(image=seg_img, gpu="T4", cpu=8.0, memory=32768, timeout=3600, secrets=[secret])
def eval_regions(zone_xy: dict, radius_px: int = 90, tag: str = "v1") -> dict:
    """Frozen BEFORE training: per held-out image, STATIC target pixels = near observed zone points (disc radius)
    & dataset keep-mask & not sky/water/vegetation (SegFormer-B4 ADE20K); VEGETATION stress pixels = same zone &
    keep & tree/plant/flower/palm. Written to eval_regions/<tag>/{static,veg}/<name>."""
    import cv2
    import numpy as np
    import torch
    from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
    s3, b = _s3(), _bucket()
    name = "nvidia/segformer-b4-finetuned-ade-512-512"
    proc = SegformerImageProcessor.from_pretrained(name)
    model = SegformerForSemanticSegmentation.from_pretrained(name).eval().cuda()
    VEG = [4, 17, 66, 72]; DROP = [2, 21, 26, 60, 109]      # sky, water, sea, river, swimming pool
    pre = "experimental/spirula-hardened/datasets/backyard-zone-v1-D"
    man = json.loads(s3.get_object(Bucket=b, Key=f"{pre}/dataset_manifest.json")["Body"].read())
    sha = {f["path"]: f["sha256"] for f in man["files"]}
    out = {}
    for n, xy in zone_xy.items():
        img = cv2.imdecode(np.frombuffer(s3.get_object(Bucket=b, Key=f"{pre}/objects/{sha['images/' + n]}")["Body"].read(), np.uint8), cv2.IMREAD_COLOR)
        keep = cv2.imdecode(np.frombuffer(s3.get_object(Bucket=b, Key=f"{pre}/objects/{sha['masks/' + n]}")["Body"].read(), np.uint8), 0) > 0
        H, W = img.shape[:2]
        zone = np.zeros((H, W), np.uint8)
        for x, y in xy:
            cv2.circle(zone, (int(x), int(y)), radius_px, 1, -1)
        sw, sh = (1024, int(1024 * H / W))
        small = cv2.resize(img, (sw, sh), interpolation=cv2.INTER_AREA)[..., ::-1]
        inp = proc(images=small, return_tensors="pt", do_resize=False).to("cuda")
        with torch.no_grad():
            lg = model(**inp).logits
        lab = torch.nn.functional.interpolate(lg, size=(sh, sw), mode="bilinear", align_corners=False).argmax(1)[0].cpu().numpy()
        lab = cv2.resize(lab.astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST)
        veg = np.isin(lab, VEG); drop = np.isin(lab, DROP)
        base = (zone > 0) & keep & ~drop
        static = base & ~cv2.dilate(veg.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
        vegm = base & veg
        for kind, m in (("static", static), ("veg", vegm)):
            ok, png = cv2.imencode(".png", m.astype(np.uint8) * 255)
            s3.put_object(Bucket=b, Key=f"{ROOT}/eval_regions/{tag}/{kind}/{n}", Body=png.tobytes())
        out[n] = {"zoneObs": len(xy), "staticPx": int(static.sum()), "vegPx": int(vegm.sum())}
    s3.put_object(Bucket=b, Key=f"{ROOT}/eval_regions/{tag}/summary.json", Body=json.dumps(out, indent=1).encode())
    return {"images": len(out), "withStatic": sum(1 for v in out.values() if v["staticPx"] > 20000),
            "withVeg": sum(1 for v in out.values() if v["vegPx"] > 20000)}


score_img = gpu_img.pip_install("lpips==0.1.4", "scikit-image==0.24.0").run_commands(
    "python -c \"import lpips; lpips.LPIPS(net='alex')\"")


@app.function(image=score_img, gpu="T4", cpu=8.0, memory=32768, timeout=2 * 3600, secrets=[secret])
def score_run(run_id: str, attempt: str, tag: str = "v1") -> dict:
    """Held-out scoring inside the FROZEN regions (eval_regions/<tag>): eval-gt PNGs are mapped to dataset names by
    decoded-pixel hash. Per image & region: PSNR/SSIM/LPIPS raw and after a per-image 3x4 colour fit (render->gt, in
    region), and fine-detail ratio (render / gt Laplacian energy). Aggregated per source (x4 / gopro / iphone)."""
    import hashlib as H
    import cv2
    import lpips
    import numpy as np
    import torch
    from skimage.metrics import structural_similarity as ssim
    s3, b = _s3(), _bucket()
    SR = "experimental/spirula-hardened"
    pre = f"{SR}/datasets/backyard-zone-v1-D"
    man = json.loads(s3.get_object(Bucket=b, Key=f"{pre}/dataset_manifest.json")["Body"].read())
    sha = {f["path"]: f["sha256"] for f in man["files"]}
    summ = json.loads(s3.get_object(Bucket=b, Key=f"{ROOT}/eval_regions/{tag}/summary.json")["Body"].read())
    get = lambda k: cv2.imdecode(np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8), cv2.IMREAD_UNCHANGED)
    phash = {}
    for n in summ:
        im = get(f"{pre}/objects/{sha['images/' + n]}")
        phash[H.md5(np.ascontiguousarray(im[..., :3]).tobytes()).hexdigest()] = n
    rp = f"{SR}/runs/{run_id}/final/{attempt}/run/"
    keys, tok = [], None
    while True:
        kw = {"Bucket": b, "Prefix": rp}
        if tok:
            kw["ContinuationToken"] = tok
        r = s3.list_objects_v2(**kw); keys += [o["Key"] for o in r.get("Contents", [])]
        if not r.get("IsTruncated"):
            break
        tok = r["NextContinuationToken"]
    gts = sorted(k for k in keys if "/eval-gt-" in k)
    net = lpips.LPIPS(net="alex").cuda()

    def lp(a, b_):
        t = lambda x: torch.from_numpy(x[..., ::-1].copy()).permute(2, 0, 1)[None].float().div(127.5).sub(1).cuda()
        with torch.no_grad():
            return float(net(t(a), t(b_)))

    def hf(x, m):
        g = cv2.cvtColor(x, cv2.COLOR_BGR2GRAY).astype(np.float32)
        return float(np.abs(cv2.Laplacian(g, cv2.CV_32F))[m].mean())
    per = {}; unmatched = 0
    for gk in gts:
        gt = get(gk)[..., :3]
        n = phash.get(H.md5(np.ascontiguousarray(gt).tobytes()).hexdigest())
        if n is None:
            unmatched += 1; continue
        rd = get(gk.replace("/eval-gt-", "/eval-render-"))[..., :3]
        rec = {}
        for kind in ("static", "veg"):
            m = get(f"{ROOT}/eval_regions/{tag}/{kind}/{n}") > 0
            if m.sum() < 20000:
                continue
            ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            g, r_, mm = gt[y0:y1, x0:x1].astype(np.float32), rd[y0:y1, x0:x1].astype(np.float32), m[y0:y1, x0:x1]
            X = np.hstack([r_[mm], np.ones((mm.sum(), 1), np.float32)])
            A = np.linalg.lstsq(X, g[mm], rcond=None)[0]
            rc = np.clip(np.concatenate([r_.reshape(-1, 3), np.ones((r_.shape[0] * r_.shape[1], 1), np.float32)], 1) @ A, 0, 255).reshape(r_.shape)
            out = {}
            for lab, rr in (("raw", r_), ("cc", rc)):
                mse = float(((rr - g)[mm] ** 2).mean())
                rr8 = rr.round().astype(np.uint8); g8 = g.astype(np.uint8)
                comp = g8.copy(); comp[mm] = rr8[mm]
                sm = ssim(cv2.cvtColor(g8, cv2.COLOR_BGR2GRAY), cv2.cvtColor(comp, cv2.COLOR_BGR2GRAY), full=True, data_range=255)[1]
                sc = 1024 / max(comp.shape[:2])
                small = lambda z: cv2.resize(z, (max(32, int(z.shape[1] * sc)), max(32, int(z.shape[0] * sc))), interpolation=cv2.INTER_AREA) if sc < 1 else z
                out[lab] = {"psnr": round(10 * np.log10(255 ** 2 / max(mse, 1e-6)), 3), "ssim": round(float(sm[mm].mean()), 4),
                            "lpips": round(lp(small(comp), small(g8)), 4)}
            out["detailRatio"] = round(hf(rd[y0:y1, x0:x1], mm) / max(hf(gt[y0:y1, x0:x1], mm), 1e-6), 4)
            out["px"] = int(mm.sum())
            rec[kind] = out
        per[n] = rec
    agg = {}
    for n, rec in per.items():
        s = "x4" if n.startswith("x4_") else n.split("/")[0]
        for kind, v in rec.items():
            a = agg.setdefault(f"{s}:{kind}", {"n": 0, "raw": {}, "cc": {}, "detailRatio": []})
            a["n"] += 1; a["detailRatio"].append(v["detailRatio"])
            for lab in ("raw", "cc"):
                for mk, mv in v[lab].items():
                    a[lab].setdefault(mk, []).append(mv)
    for a in agg.values():
        a["detailRatio"] = round(float(np.mean(a["detailRatio"])), 4)
        for lab in ("raw", "cc"):
            a[lab] = {mk: round(float(np.mean(mv)), 4) for mk, mv in a[lab].items()}
    res = {"run": run_id, "attempt": attempt, "evalPairs": len(gts), "matched": len(per), "unmatched": unmatched, "bySourceRegion": agg}
    s3.put_object(Bucket=b, Key=f"{ROOT}/scores/{tag}/{run_id}.json", Body=json.dumps({"summary": res, "perImage": per}, indent=1).encode())
    return res


@app.function(image=img, cpu=8.0, memory=32768, timeout=3600, secrets=[secret])
def ab_montage(picks: list, tag: str = "v1") -> dict:
    """GT | A | D crops (static-region bbox, native scale up to 900 px tall) for the named held-out images."""
    import hashlib as H
    import cv2
    import numpy as np
    s3, b = _s3(), _bucket()
    SR = "experimental/spirula-hardened"
    get = lambda k: cv2.imdecode(np.frombuffer(s3.get_object(Bucket=b, Key=k)["Body"].read(), np.uint8), cv2.IMREAD_COLOR)
    man = json.loads(s3.get_object(Bucket=b, Key=f"{SR}/datasets/backyard-zone-v1-D/dataset_manifest.json")["Body"].read())
    sha = {f["path"]: f["sha256"] for f in man["files"]}
    want = {H.md5(get(f"{SR}/datasets/backyard-zone-v1-D/objects/{sha['images/' + n]}").tobytes()).hexdigest(): n for n in picks}
    idx = {}
    for run in ("a", "d"):
        rp = f"{SR}/runs/backyard-zone-v1-{run}/final/backyard-zone-v1-{run}-a01/run/"
        for i in range(101):
            g = get(f"{rp}eval-gt-{i:05d}.png")
            n = want.get(H.md5(g.tobytes()).hexdigest())
            if n:
                idx.setdefault(n, {})[run] = i
    rows = []
    for n in picks:
        m = get(f"{ROOT}/eval_regions/{tag}/static/{n}")[..., 0] > 0
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        cy, cx = (y0 + y1) // 2, (x0 + x1) // 2; h = min(900, y1 - y0 + 200); w = int(h * 1.2)
        y0, x0 = max(0, cy - h // 2), max(0, cx - w // 2)
        tiles = []
        for lab, run, kind in (("GT", "a", "gt"), ("A x4-only", "a", "render"), ("D fused", "d", "render")):
            im = get(f"{SR}/runs/backyard-zone-v1-{run}/final/backyard-zone-v1-{run}-a01/run/eval-{kind}-{idx[n][run]:05d}.png")
            c = im[y0:y0 + h, x0:x0 + w].copy()
            c = cv2.resize(c, (720, int(720 * c.shape[0] / c.shape[1])))
            cv2.putText(c, f"{lab} {n}", (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            tiles.append(c)
        hh = min(t.shape[0] for t in tiles)
        rows.append(np.hstack([t[:hh] for t in tiles]))
    out = {}
    for j in range(0, len(rows), 3):
        grp = rows[j:j + 3]; ww = max(r.shape[1] for r in grp)
        ok, jpg = cv2.imencode(".jpg", np.vstack(grp), [cv2.IMWRITE_JPEG_QUALITY, 88])
        k = f"{ROOT}/scores/{tag}/ab_montage_{j // 3}.jpg"
        s3.put_object(Bucket=b, Key=k, Body=jpg.tobytes()); out[k] = [n for n in picks[j:j + 3]]
    return {"index": idx, "sheets": out}
