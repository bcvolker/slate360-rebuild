"""Room 213 new capture (2026-09-29) — Stage 0 cloud verification + Stage 1 metadata/source inspection.
Reads the ORIGINALS from private R2 (experimental/spirula-hardened/room213-capture-2026-09-29/raw/), re-hashes every
object in the cloud against the laptop manifest, copies them byte-for-byte to the Modal volume
(/vol/room213/2026-09-29/capture/raw/), and extracts metadata with ffprobe, exiftool (incl. embedded/trailer data) and
the official Spirula v2026.9.24 decoder. Never modifies an original. Deploy + spawn."""
import modal

app = modal.App("slate360-room213-capture")
vol = modal.Volume.from_name("slate360-recon-experiments")
secret = modal.Secret.from_name("slate360-twin-worker")
REL = "https://github.com/harry7557558/spirula-studio/releases/download/v2026.9.24/spirula-2026.9.24-ubuntu-vulkan-x86_64.zip"
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11")
         .apt_install("libvulkan1", "unzip", "wget", "ffmpeg", "libimage-exiftool-perl", "libgomp1", "libgl1", "libglib2.0-0t64", "libegl1",
                      "libx11-6", "libxext6", "libopengl0", "libglx0", "libxrandr2", "libxinerama1", "libxcursor1", "libxi6",
                      "libwayland-client0", "libxkbcommon0", "libdbus-1-3", "libgtk-3-0t64")
         .run_commands(f"wget -q -O /tmp/sp.zip {REL} && mkdir -p /opt/spirula && cd /opt/spirula && unzip -q /tmp/sp.zip")
         .pip_install("boto3", "numpy", "opencv-python-headless", "pillow", "rawpy")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}))
PREFIX = "experimental/spirula-hardened/room213-capture-2026-09-29"
DST = "/vol/room213/2026-09-29/capture"


def s3c():
    import os, boto3
    ep = os.environ.get("R2_ENDPOINT") or f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    from botocore.config import Config
    cfg = Config(read_timeout=300, connect_timeout=60, retries={"max_attempts": 10, "mode": "adaptive"})
    return boto3.client("s3", endpoint_url=ep, aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto", config=cfg), os.environ["R2_BUCKET"]


@app.function(image=image, cpu=8.0, memory=32768, timeout=6 * 3600, secrets=[secret], volumes={"/vol": vol})
def verify_and_copy_v2() -> dict:
    import hashlib, json
    from pathlib import Path
    from boto3.s3.transfer import TransferConfig
    s3, b = s3c()
    man = json.loads(s3.get_object(Bucket=b, Key=f"{PREFIX}/local_manifest.json")["Body"].read())
    raw = Path(f"{DST}/raw"); raw.mkdir(parents=True, exist_ok=True); out = []
    tc = TransferConfig(multipart_threshold=64 << 20, multipart_chunksize=64 << 20, max_concurrency=8)
    for m in man:
        dst = raw / m["file"]
        if not (dst.is_file() and dst.stat().st_size == m["bytes"]):
            s3.download_file(b, f"{PREFIX}/raw/{m['file']}", str(dst), Config=tc)
        h = hashlib.sha256()
        with open(dst, "rb") as f:
            for c in iter(lambda: f.read(16 << 20), b""): h.update(c)
        n = dst.stat().st_size
        ok = n == m["bytes"] and h.hexdigest() == m["sha256"]
        out.append({**m, "cloud_bytes": n, "cloud_sha256": h.hexdigest(), "verified": ok})
        vol.commit()
    vol.commit()
    res = {"files": len(out), "verified": sum(o["verified"] for o in out), "bytes": sum(o["bytes"] for o in out), "detail": out}
    json.dump(res, open(f"{DST}/cloud_verification.json", "w"), indent=1); vol.commit()
    s3.put_object(Bucket=b, Key=f"{PREFIX}/cloud_verification.json", Body=json.dumps(res, indent=1).encode())
    return {k: v for k, v in res.items() if k != "detail"} | {"failed": [o["file"] for o in out if not o["verified"]]}


@app.function(image=image, gpu="L40S", cpu=8.0, memory=65536, timeout=3 * 3600, secrets=[secret], volumes={"/vol": vol})
def metadata() -> dict:
    import json, subprocess, cv2, numpy as np
    from pathlib import Path
    vol.reload(); raw = Path(f"{DST}/raw"); res = {}
    sh = lambda c: subprocess.run(["bash", "-c", c], capture_output=True, text=True).stdout
    for p in sorted(raw.iterdir()):
        r = {"exif": {}}
        ex = sh(f"exiftool -j -G1 -a -n -ee3 '{p}' 2>/dev/null | head -c 400000")
        try:
            d = json.loads(ex)[0]
            keep = [k for k in d if any(s in k.lower() for s in ("image", "date", "exposure", "iso", "shutter", "fnumber", "model", "make",
                    "software", "duration", "frame", "width", "height", "projection", "compressor", "bitrate", "gain", "white", "firmware",
                    "mode", "gps", "file:", "resolution", "hdr", "fps", "lens"))]
            r["exif"] = {k: d[k] for k in keep[:120]}
            r["exif_all_keys"] = len(d)
        except Exception as e:
            r["exif_error"] = str(e)[:200]
        if p.suffix.lower() in (".insv", ".lrv"):
            r["ffprobe"] = json.loads(sh(f"ffprobe -v error -show_entries stream=index,codec_type,codec_name,profile,width,height,r_frame_rate,avg_frame_rate,nb_frames,bit_rate,duration,pix_fmt:format=duration,bit_rate -of json '{p}'") or "{}")
            if p.suffix.lower() == ".insv":
                r["spirula_info"] = sh(f"/opt/spirula/spirula sam video --info '{p}' 2>&1 | tail -8")
                # per-frame exposure samples embedded in the Insta360 trailer, where exiftool exposes them
                r["exposure_samples"] = sh(f"exiftool -ee3 -n -p '$ExposureTime $ISO' '{p}' 2>/dev/null | head -2000 | sort | uniq -c | sort -rn | head -12")
        if p.suffix.lower() in (".jpg", ".dng"):
            if p.suffix.lower() == ".jpg":
                im = cv2.imread(str(p)); r["pixels"] = list(im.shape) if im is not None else None
            else:
                import rawpy
                try:
                    with rawpy.imread(str(p)) as rp:
                        r["raw"] = {"raw_shape": list(rp.raw_image.shape), "sizes": str(rp.sizes)[:300], "color_desc": rp.color_desc.decode(), "black": rp.black_level_per_channel, "white": int(rp.white_level)}
                except Exception as e:
                    r["raw_error"] = str(e)[:200]
        res[p.name] = r
    json.dump(res, open(f"{DST}/metadata.json", "w"), indent=1, default=str); vol.commit()
    return res
