"""READ-ONLY probe for the Harry repro package: .insv trailer records, container metadata, secret key names."""
import modal

app = modal.App("slate360-room213-repro-probe")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.from_registry("ubuntu:24.04", add_python="3.11").apt_install("ffmpeg").pip_install("numpy")
INSV = "/vol/room213/2026-09-29/capture/raw/VID_20260929_152303_00_079.insv"


@app.function(image=image, volumes={"/vol": vol}, secrets=[modal.Secret.from_name("slate360-twin-worker")], timeout=1800)
def probe():
    import os, struct, subprocess, json, re
    out = {"secret_keys": sorted(k for k in os.environ if any(s in k for s in ("R2", "S3", "AWS", "CLOUDFLARE")))}
    f = open(INSV, "rb"); f.seek(0, 2); n = f.tell(); out["size"] = n
    f.seek(n - 72); h = f.read(72); extra = struct.unpack("<I", h[32:36])[0]; out["trailer_bytes"] = extra
    out["trailer_magic"] = h[-32:].decode("latin1", "replace")
    f.seek(n - extra); blob = f.read(extra)
    off = extra - 72; idx = blob[off - 256:off - 6]; ents = {}
    for i in range(len(idx) - 9):
        rid, fmt, size, o = struct.unpack("<BBII", idx[i:i + 10])
        if rid and size and 0 <= o and o + size <= extra: ents.setdefault((rid, fmt), (size, o))
    out["records"] = sorted([[r, fm, s] for (r, fm), (s, o) in ents.items()])
    for (r, fm), (s, o) in ents.items():
        if r == 7: out["rec7_head"] = blob[o:o + 96].hex(); out["rec7_size"] = s
    # dual-check: the Spirula manifest might carry GPS too
    import glob
    for p in glob.glob("/vol/room213/2026-09-29/capture/conditions/A/ws/.spirula_manifest.yaml"):
        out["manifest_head"] = open(p).read()[:3000]
    pr = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", INSV], capture_output=True, text=True)
    j = json.loads(pr.stdout)
    out["format_tags"] = j["format"].get("tags", {}); out["duration"] = j["format"].get("duration")
    out["streams"] = [{k: s.get(k) for k in ("index", "codec_type", "codec_name", "width", "height", "r_frame_rate", "nb_frames", "bit_rate", "tags")} for s in j["streams"]]
    return out


@app.local_entrypoint()
def main():
    import json
    print(json.dumps(probe.remote(), indent=1))
