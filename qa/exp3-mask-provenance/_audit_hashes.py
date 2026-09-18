import sys, os, json, hashlib
sys.path.insert(0, "/mnt/c/s360-recon-exp/workers/recon-experiment")
from pathlib import Path
import numpy as np
from PIL import Image
from hashes import sha256_dir, sha256_file

SCRATCH = Path("/mnt/c/s360-recon-exp/qa/exp3-mask-provenance/_scratch")
LOCAL = Path("/mnt/c/s360/tmp/splat-lab/cecc2763/views/masks")
VOLUME = SCRATCH / "vol-masks-dir" / "masks"
TAR = SCRATCH / "tar-extract" / "views" / "masks"

sets = {"local": LOCAL, "volume": VOLUME, "tar": TAR}

print("=== sha256_dir aggregate hashes (the mask_hash algorithm) ===")
agg = {}
for name, d in sets.items():
    h = sha256_dir(d, ("*.png",))
    agg[name] = h
    print(f"{name:8s} sha256_dir = {h}")

def raw_hashes(d: Path):
    out = {}
    for p in sorted(d.glob("*.png")):
        out[p.name] = sha256_file(p)
    return out

def decoded_pixel_hashes(d: Path):
    out = {}
    for p in sorted(d.glob("*.png")):
        arr = np.asarray(Image.open(p).convert("L"))
        out[p.name] = hashlib.sha256(arr.tobytes()).hexdigest()
    return out

print("\n=== computing raw + decoded-pixel per-file hashes for all three sets ===")
raw = {name: raw_hashes(d) for name, d in sets.items()}
dec = {name: decoded_pixel_hashes(d) for name, d in sets.items()}

with open(SCRATCH / "raw_hashes.json", "w") as f:
    json.dump(raw, f)
with open(SCRATCH / "decoded_hashes.json", "w") as f:
    json.dump(dec, f)
with open(SCRATCH / "agg_hashes.json", "w") as f:
    json.dump(agg, f)

print("done: wrote raw_hashes.json, decoded_hashes.json, agg_hashes.json")
print("counts:", {k: len(v) for k, v in raw.items()})
