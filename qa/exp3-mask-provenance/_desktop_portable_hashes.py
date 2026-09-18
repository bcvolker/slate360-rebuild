import sys, json
sys.path.insert(0, "/mnt/c/s360-recon-exp/workers/recon-experiment")
from pathlib import Path
from hashes import sha256_dir, sha256_file

JOB = Path("/mnt/c/s360/tmp/splat-lab/cecc2763")
out = {
    "mask_hash": sha256_dir(JOB / "views" / "masks", ("*.png",)),
    "pose_hash": sha256_file(JOB / "views" / "transforms.json"),
    "seed_hash": sha256_file(JOB / "sfm" / "points.ply"),
}
print(json.dumps(out, indent=2))
Path("/mnt/c/s360-recon-exp/qa/exp3-mask-provenance/_scratch/desktop_portable_hashes.json").write_text(json.dumps(out, indent=2))
